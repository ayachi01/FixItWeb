# ==================================================
#                   Imports
# ==================================================
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model, authenticate
from django.core.mail import send_mail
from django.utils.encoding import force_str, force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import update_last_login

from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

# -------------------- Models --------------------
from core.models import (
    Ticket,
    AuditLog,
    UserProfile,
    Invite,
    Location,
    PasswordResetCode,
    TicketAssignment,
    StudentProfile,
    Role,
    DomainRoleMapping,
)

# Import your models and serializers
from .models import TicketImage

from django.db.models import Prefetch

# ✅ Always reference the active User model
User = get_user_model()

# -------------------- Serializers --------------------
from core.serializers import (
    UserProfileSerializer,
    InviteSerializer,
    TicketSerializer,
    EmailTokenObtainPairSerializer,
    LocationSerializer,
    InviteAcceptSerializer,
    TicketResolutionSerializer,
    AuditLogSerializer,
    RoleSerializer,
)

from django.db import transaction


# -------------------- Tasks --------------------
from core.tasks import check_escalation

# -------------------- Throttles --------------------
from core.throttles import OTPThrottle, PasswordResetThrottle

# -------------------- Helpers --------------------
from core.utils.audit import create_audit
from core.utils.email_utils import deliver_code, send_verification_email
from core.utils.security import generate_otp

import json

# ==================================================
#                  User Management (Core)
# ==================================================
# This ViewSet handles user CRUD, registration, invites, and password management.
# Relationships:
# - Depends on Role and DomainRoleMapping for role assignment.
# - Integrates with StudentProfile for student-specific data.
# - Uses AuditLog for all actions.
# - Feeds into Auth views for login/registration flows.
# - Queried by TicketViewSet for assignee/reporter permissions.


# ==========================
# UserViewSet
# ==========================



class UserViewSet(viewsets.ModelViewSet):
    """
    Production-ready UserViewSet:
    - Serializer handles create/update of User + UserProfile + StudentProfile
    - Backend enforces business rules (role assignment, student fields, who can change role)
    - Clean query filters (ORM) for frontend-friendly usage
    - Auxiliary actions: login, register, OTP, invites, password reset
    """
    queryset = UserProfile.objects.select_related("user", "role").all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    # ---------- Permission Overrides ----------
    def get_permissions(self):
        open_actions = [
            "register_self_service",
            "create_user",
            "email_login",
            "verify_otp",
            "resend_otp",
            "reset_password_request",
            "reset_password_confirm",
            "accept_invite",
            "accept_invite_with_token",
        ]
        if self.action in open_actions:
            return [AllowAny()]
        return super().get_permissions()

    # ---------- Helpers ----------
    def _is_system_admin(self, user):
        if not user or not getattr(user, "is_authenticated", False):
            return False
        try:
            profile = getattr(user, "profile", None)
            if profile and getattr(profile, "can_manage_users", False):
                return True
        except Exception:
            pass
        return user.is_superuser

    def _require_admin_or_403(self, request):
        if not self._is_system_admin(request.user):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return None

    # ---------- CRUD ----------
    def list(self, request, *args, **kwargs):
        admin_check = self._require_admin_or_403(request)
        if admin_check:
            return admin_check
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, pk=None):
        try:
            # Match by related user id
            profile = UserProfile.objects.select_related("user", "role").get(user__id=pk)
        except UserProfile.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if not self._is_system_admin(request.user) and profile.user != request.user:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        admin_check = self._require_admin_or_403(request)
        if admin_check:
            return admin_check

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            profile = serializer.save()
            profile.created_by_admin = True
            profile.save()

            create_audit(
                "User Created (admin)",
                performed_by=request.user,
                target_user=profile.user,
                details=f"Admin-created user {profile.user.email}",
            )

        return Response(self.get_serializer(profile).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            # Match by related user id
            profile = UserProfile.objects.select_related("user", "role").get(user__id=pk)
        except UserProfile.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()

        if not self._is_system_admin(request.user):
            if profile.user != request.user:
                return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
            for forbidden in [
                "role_id",
                "role",
                "is_email_verified",
                "email_domain",
                "can_manage_users",
                "is_admin_level",
            ]:
                data.pop(forbidden, None)

        serializer = self.get_serializer(profile, data=data, partial=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            profile = serializer.save()

            # ✅ Update the related User model (so name/email changes persist)
            user = profile.user
            name = data.get("full_name")
            if name:
                parts = name.split(" ", 1)
                user.first_name = parts[0]
                user.last_name = parts[1] if len(parts) > 1 else ""
            if "email" in data:
                user.email = data["email"]
            user.save()

            if self._is_system_admin(request.user):
                create_audit(
                    "User Updated",
                    performed_by=request.user,
                    target_user=user,
                    details=f"Profile updated for {user.email}",
                )

        return Response(self.get_serializer(profile).data, status=status.HTTP_200_OK)


    def destroy(self, request, pk=None):
        admin_check = self._require_admin_or_403(request)
        if admin_check:
            return admin_check

        try:
            # Match by related user id
            profile = UserProfile.objects.select_related("user").get(user__id=pk)
        except UserProfile.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        user = profile.user

        create_audit(
            "User Deleted",
            performed_by=request.user,
            target_user=user,
            details=f"User {user.email} deleted",
        )

        with transaction.atomic():
            profile.delete()
            user.delete()

        return Response({"message": "User deleted successfully"}, status=status.HTTP_200_OK)

    def get_queryset(self):
        qs = UserProfile.objects.select_related("user", "role").all()
        q = self.request.query_params
        can_fix = q.get("can_fix")
        can_assign = q.get("can_assign")
        if can_fix is not None:
            qs = qs.filter(role__permissions__can_fix=can_fix.lower() in ("true", "1", "yes"))
        if can_assign is not None:
            qs = qs.filter(role__permissions__can_assign=can_assign.lower() in ("true", "1", "yes"))
        role = q.get("role")
        if role:
            qs = qs.filter(role__name__iexact=role)
        email = q.get("email")
        if email:
            qs = qs.filter(user__email__icontains=email)
        return qs

    # -------------------- Email Login --------------------
    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def email_login(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        if not email or not password:
            return Response({"error": "Email and password required"}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(request, email=email, password=password)
        if not user:
            create_audit("Login Failed", None, None, details=f"Failed login attempt for {email}")
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"error": "Account not active"}, status=status.HTTP_403_FORBIDDEN)
        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        profile_data = UserProfileSerializer(user.profile).data
        create_audit("Login Success", user, user, details=f"Successful login for {email}")
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh), "profile": profile_data},
            status=status.HTTP_200_OK,
        )

    # -------------------- Self-service Registration --------------------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register_self_service(self, request):
        required = ["first_name", "last_name", "email", "password", "confirm_password"]
        if not all(request.data.get(k) for k in required):
            return Response({'error': 'All fields required'}, status=status.HTTP_400_BAD_REQUEST)
        if request.data.get("password") != request.data.get("confirm_password"):
            return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

        email = request.data["email"].lower()
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

        domain = email.split('@')[-1].lower()
        if domain != "pirmaed.com":
            return Response({'error': 'Only pirmaed.com emails are allowed for registration'}, status=status.HTTP_400_BAD_REQUEST)

        mapping = DomainRoleMapping.objects.filter(domain__iexact=domain).first()
        role = mapping.role if mapping else Role.objects.get_or_create(name="Student")[0]

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=request.data["password"],
                first_name=request.data["first_name"],
                last_name=request.data["last_name"],
                is_active=False
            )
            profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"role": role, "is_email_verified": False})

            if role.name.lower() == "student" and any([
                request.data.get("student_id"), request.data.get("course"), request.data.get("year_level")
            ]):
                StudentProfile.objects.create(
                    user_profile=profile,
                    student_id=request.data.get("student_id"),
                    course_code=request.data.get("course"),
                    year_level=request.data.get("year_level"),
                    section=request.data.get("section"),
                    college=request.data.get("college"),
                    enrollment_year=request.data.get("enrollment_year"),
                )

            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            verify_url = f"http://localhost:5173/verify-email/{uidb64}/{token}/"
            deliver_code(email, "Verify your account", f"Click here to verify: {verify_url}", "LINK")

            create_audit("User Created (self)", None, user, details=f"Self-service registration for {email}")
            create_audit("Verification Link Sent", None, user, details=f"Link sent to {email}")

        return Response({
            "message": "User registered successfully. Please verify your email.",
            "verification_link": verify_url,
            "profile": UserProfileSerializer(profile).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='create')
    def create_user(self, request):
        return self.register_self_service(request)

    # -------------------- OTP Verification --------------------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[OTPThrottle])
    def verify_otp(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        if not email or not otp:
            return Response({'error': 'Email and OTP required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if not getattr(user, "otp_created_at", None) or timezone.now() > user.otp_created_at + timezone.timedelta(minutes=5):
            user.clear_otp()
            user.save()
            create_audit("OTP Expired", None, user, details=f"Expired OTP for {email}")
            return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_otp(otp):
            create_audit("OTP Failed", None, user, details=f"Invalid OTP attempt for {email}")
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.clear_otp()
        user.save()
        profile = user.profile
        profile.is_email_verified = True
        profile.save()
        create_audit("OTP Verified", user, user, details=f"OTP verified, account activated for {email}")
        return Response({'message': 'Email verified, account activated. You can now log in.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[OTPThrottle])
    def resend_otp(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        if user.is_active:
            return Response({'error': 'Account already verified'}, status=status.HTTP_400_BAD_REQUEST)
        otp_code = generate_otp()
        user.set_otp(otp_code)
        user.save()
        deliver_code(email, "Your New OTP Code", f"Your new OTP is {otp_code}", "Resent OTP")
        create_audit("OTP Resent", None, user, details=f"New OTP generated for {email}")
        return Response({'message': 'New OTP resent successfully'}, status=status.HTTP_200_OK)

    # -------------------- Password Reset --------------------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[PasswordResetThrottle])
    def reset_password_request(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        reset_code_obj, raw_code = PasswordResetCode.objects.create_for_user(user)
        deliver_code(email, "Password Reset Code", f"Your password reset code is {raw_code}", "password_reset")
        create_audit("Password Reset Requested", None, user, details=f"Password reset code generated for {user.email}")
        return Response({"message": "Password reset code sent"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[PasswordResetThrottle])
    def reset_password_confirm(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("new_password")
        if not email or not code or not new_password:
            return Response({"error": "Email, code, and new_password are required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid email or code"}, status=status.HTTP_400_BAD_REQUEST)

        reset_qs = PasswordResetCode.objects.filter(user=user, is_used=False).order_by('-created_at')
        if not reset_qs.exists():
            return Response({"error": "Invalid or already used code"}, status=status.HTTP_400_BAD_REQUEST)
        reset_code = reset_qs.first()
        if reset_code.is_expired():
            return Response({"error": "Code expired"}, status=status.HTTP_400_BAD_REQUEST)
        if not reset_code.check_code(code):
            return Response({"error": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        reset_code.mark_used()
        create_audit("Password Reset Confirmed", user, user, details=f"Password reset successful for {user.email}")
        return Response({"message": "Password has been reset successfully"}, status=status.HTTP_200_OK)
    

















class InviteViewSet(viewsets.ModelViewSet):
    """
    Handles user invites for privileged roles.
    Admins can create/list/delete invites.
    Invited users can validate and register via invite token.
    """

    queryset = Invite.objects.select_related("role", "created_by").order_by("-created_at")
    serializer_class = InviteSerializer

    def get_permissions(self):
        """
        Permissions:
        - Admins can create, list, or delete invites.
        - Anyone can validate or register using a token.
        """
        if self.action in ["create", "list", "destroy", "resend"]:
            return [IsAdminUser()]
        if self.action in ["register", "validate"]:
            return [AllowAny()]
        return [IsAdminUser()]

    # ==============================================================    
    # ✅ Admin creates invite
    # ==============================================================
    def perform_create(self, serializer):
        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]

        invite, created = Invite.objects.get_or_create(
            email=email,
            is_used=False,
            defaults={"role": role, "created_by": self.request.user},
        )

        # If same email exists but role changed → update
        if not created and invite.role != role:
            invite.role = role
            invite.save(update_fields=["role"])

        # ✅ Send invite link
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        invite_url = f"{frontend_url}/invite/{invite.token}"

        deliver_code(
            invite.email,
            "You're Invited!",
            f"You've been invited to join the system as a {invite.role.name}. "
            f"Click the link below to complete your registration:\n\n{invite_url}",
            "LINK",
        )

        return invite

    # ==============================================================    
    # ✅ Validate invite token
    # ==============================================================
    @action(detail=False, methods=["post"], url_path="validate")
    def validate(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invite = Invite.objects.select_related("role").get(token=token)
        except Invite.DoesNotExist:
            return Response({"error": "Invalid or expired invite"}, status=status.HTTP_404_NOT_FOUND)

        if not invite.can_be_used():
            return Response(
                {"error": "Invite cannot be used (expired or already used)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = InviteSerializer(invite)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # ==============================================================    
    # ✅ Register via Invite
    # ==============================================================
    @action(detail=False, methods=["post"], url_path="register")
    def register(self, request):
        print("[DEBUG REGISTER DATA]", request.data)
        required_fields = ["token", "first_name", "last_name", "password", "confirm_password"]
        if not all(request.data.get(f) for f in required_fields):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        token = request.data["token"]
        password = request.data["password"]
        confirm_password = request.data["confirm_password"]

        if password != confirm_password:
            return Response({"error": "Passwords do not match"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate invite
        try:
            invite = Invite.objects.select_related("role").get(token=token)
        except Invite.DoesNotExist:
            return Response({"error": "Invalid invite"}, status=status.HTTP_400_BAD_REQUEST)

        if not invite.can_be_used():
            return Response(
                {"error": "Invite cannot be used (expired or already used)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create or update user
        with transaction.atomic():
            username = invite.email.split("@")[0].lower()
            user, created = User.objects.get_or_create(
                email=invite.email,
                defaults={
                    "username": username,
                    "first_name": request.data["first_name"],
                    "last_name": request.data["last_name"],
                    "is_active": True,
                },
            )

            if hasattr(user, "userprofile") and user.userprofile.role:
                return Response(
                    {"error": "This invite has already been used."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.set_password(password)
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = invite.role
            profile.is_email_verified = True
            profile.created_by_admin = True
            profile.save()

            invite.mark_used()

        return Response({"message": "User registered successfully via invite"}, status=status.HTTP_201_CREATED)

    # ==============================================================    
    # ✅ Resend Invite
    # ==============================================================
    @action(detail=True, methods=["post"], url_path="resend")
    def resend(self, request, pk=None):
        """
        Resend an existing invite to the email.
        Only works if the invite is unused and not expired.
        """
        try:
            invite = Invite.objects.get(pk=pk)
        except Invite.DoesNotExist:
            return Response({"error": "Invite not found"}, status=status.HTTP_404_NOT_FOUND)

        if not invite.can_be_used():
            return Response({"error": "Invite cannot be resent (expired or already used)"}, status=status.HTTP_400_BAD_REQUEST)

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        invite_url = f"{frontend_url}/invite/{invite.token}"

        deliver_code(
            invite.email,
            "You're Invited! (Resent)",
            f"You've been invited to join the system as a {invite.role.name}. "
            f"Click the link below to complete your registration:\n\n{invite_url}",
            "LINK",
        )

        return Response({"message": "Invite resent successfully"}, status=status.HTTP_200_OK)








# ==================================================
#                  Ticket Management (Core)
# ==================================================
# This ViewSet manages the ticket lifecycle (create, assign, resolve, etc.).
# Relationships:
# - Depends on UserProfile for permission checks (can_assign, can_fix, etc.).
# - Uses Location for ticket locations.
# - Integrates with TicketAssignment and TicketImage models.
# - Logs actions to AuditLog.
# - Queried by UserProfileView for feature flags based on role.

# ==================================================
# TicketViewSet (with proof upload support)
# ==================================================



# ==================================================
# views.py
# ==================================================
from django.db.models import Count, Avg, Q, F, DurationField, ExpressionWrapper, Prefetch
from django.db.models.functions import TruncMonth, TruncDay


# ==============================
# Ticket ViewSet (Updated)
# ==============================
from django.db.models import Count
from django.db.models.functions import TruncMonth
from rest_framework.decorators import action
from rest_framework.response import Response


class TicketViewSet(viewsets.ModelViewSet):
    """
    Ticket endpoints (list/retrieve + custom actions).
    """

    queryset = Ticket.objects.all().select_related("reporter", "location").prefetch_related(
        "images",
        Prefetch("assignments", queryset=TicketAssignment.objects.select_related("user")),
    )
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def _prefetch_queryset(self, qs):
        """Helper: consistently apply select_related and prefetch_related."""
        return qs.select_related("reporter", "location").prefetch_related(
            "images",
            Prefetch("assignments", queryset=TicketAssignment.objects.select_related("user")),
        )

    # ------------------------
    # Override create
    # ------------------------
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(reporter=request.user)

        create_audit(
            AuditLog.Action.TICKET_CREATED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} created",
        )

        headers = self.get_success_headers(serializer.data)
        return Response(
            self.get_serializer(ticket).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    # ------------------------
    # Override update
    # ------------------------
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        ticket = self.get_object()

        serializer = self.get_serializer(
            ticket, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()

        create_audit(
            AuditLog.Action.TICKET_UPDATED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} updated",
        )

        return Response(self.get_serializer(ticket).data, status=status.HTTP_200_OK)

    # ------------------------
    # Custom Endpoints
    # ------------------------
    @action(detail=False, methods=["get"], url_path="my_reports")
    def my_reports(self, request):
        tickets = self._prefetch_queryset(
            Ticket.objects.filter(reporter=request.user).distinct()
        )
        return Response(self.get_serializer(tickets, many=True).data)

    @action(detail=False, methods=["get"], url_path="assigned")
    def assigned(self, request):
        tickets = self._prefetch_queryset(
            Ticket.objects.filter(assignments__user=request.user).distinct()
        )
        return Response(self.get_serializer(tickets, many=True).data)

    @action(detail=False, methods=["get"], url_path="unassigned")
    def unassigned(self, request):
        tickets = self._prefetch_queryset(Ticket.objects.filter(assignments__isnull=True))
        return Response(self.get_serializer(tickets, many=True).data)

    @action(detail=False, methods=["post"], url_path="report_issue")
    def report_issue(self, request):
        if not getattr(request.user.profile, "can_report", False):
            return Response(
                {"error": "You are not allowed to report issues."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(reporter=request.user)

        create_audit(
            AuditLog.Action.TICKET_CREATED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} created",
        )

        return Response(self.get_serializer(ticket).data, status=status.HTTP_201_CREATED)

    # ------------------------
    # Assignment & Status Actions
    # ------------------------
    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        ticket = self.get_object()
        if not getattr(request.user.profile, "can_assign", False):
            return Response(
                {"error": "You are not authorized to assign tickets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ticket.status in [Ticket.Status.CLOSED, Ticket.Status.CANCELLED]:
            return Response(
                {"error": "Cannot assign a closed or cancelled ticket."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignee_id = request.data.get("assignee_id")
        if not assignee_id:
            return Response(
                {"error": "Assignee ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignee = get_object_or_404(User, id=assignee_id)
        profile = getattr(assignee, "profile", None)

        if not profile or not getattr(profile, "can_fix", False):
            return Response(
                {"error": "This user cannot be assigned tickets."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ticket.category not in getattr(profile, "allowed_categories", lambda: [])():
            return Response(
                {"error": f"This user cannot fix {ticket.category} tickets."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        TicketAssignment.objects.get_or_create(ticket=ticket, user=assignee)
        ticket.status = Ticket.Status.ASSIGNED
        ticket.save(update_fields=["status", "updated_at"])

        create_audit(
            AuditLog.Action.TICKET_ASSIGNED,
            performed_by=request.user,
            target_user=assignee,
            details=f"Ticket {ticket.id} assigned to {assignee.email}",
        )
        return Response({"message": f"Ticket {ticket.id} assigned to {assignee.email}"})

    @action(detail=True, methods=["get"], url_path="eligible_fixers")
    def eligible_fixers(self, request, pk=None):
        ticket = self.get_object()
        fixers = UserProfile.fixers_for_category(ticket.category)
        data = [
            {
                "id": f.user.id,
                "email": f.user.email,
                "first_name": f.user.first_name,
                "last_name": f.user.last_name,
                "full_name": f.user.get_full_name() or f.user.username,
                "role": getattr(f.role, "name", None),
            }
            for f in fixers
        ]
        return Response(data)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        ticket = self.get_object()
        if not getattr(request.user.profile, "can_close_tickets", False):
            return Response(
                {"error": "You are not authorized to close tickets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ticket.status in [Ticket.Status.CLOSED, Ticket.Status.CANCELLED]:
            return Response(
                {"error": f"Ticket is already {ticket.status.lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.status = Ticket.Status.CLOSED
        ticket.save(update_fields=["status", "updated_at"])
        create_audit(
            AuditLog.Action.TICKET_CLOSED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} closed",
        )
        return Response(
            {"message": f"Ticket {ticket.id} has been closed successfully"}
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        ticket = self.get_object()
        if request.user != ticket.reporter and not getattr(
            request.user.profile, "can_cancel_tickets", False
        ):
            return Response(
                {"error": "You are not authorized to cancel this ticket."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ticket.status in [Ticket.Status.CANCELLED, Ticket.Status.CLOSED]:
            return Response(
                {"error": f"Ticket is already {ticket.status.lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.status = Ticket.Status.CANCELLED
        ticket.save(update_fields=["status", "updated_at"])
        create_audit(
            AuditLog.Action.TICKET_CANCELLED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} cancelled",
        )
        return Response({"message": f"Ticket {ticket.id} has been cancelled"})

    # ------------------------
    # ✅ Resolve (Updated)
    # ------------------------
    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """
        Upload proof image + resolution note.
        Automatically updates ticket status to RESOLVED.
        """
        ticket = self.get_object()

        if not getattr(request.user.profile, "can_fix", False):
            return Response(
                {"error": "You are not authorized to resolve tickets."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ticket.status in [Ticket.Status.CLOSED, Ticket.Status.CANCELLED]:
            return Response(
                {"error": f"Cannot resolve a {ticket.status.lower()} ticket."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TicketResolutionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        resolution = serializer.save(ticket=ticket)

        create_audit(
            AuditLog.Action.TICKET_RESOLVED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} resolved",
        )

        # Model already handles ticket.status update in save()
        return Response(
            TicketResolutionSerializer(resolution).data,
            status=status.HTTP_201_CREATED,
        )

    # ------------------------
    # Reopen
    # ------------------------
    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status != Ticket.Status.CLOSED:
            return Response(
                {"error": "Only closed tickets can be reopened."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.status = Ticket.Status.REOPENED
        ticket.save(update_fields=["status", "updated_at"])
        create_audit(
            AuditLog.Action.TICKET_REOPENED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} reopened",
        )
        return Response({"message": f"Ticket {ticket.id} has been reopened"})

    # ------------------------
    # 💬 Comment
    # ------------------------


    @action(detail=True, methods=["post"], url_path="comment")
    def comment(self, request, pk=None):
        ticket = self.get_object()
        serializer = TicketCommentSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(ticket=ticket, author=request.user)

        create_audit(
            AuditLog.Action.TICKET_COMMENTED,
            performed_by=request.user,
            details=f"Commented on ticket {ticket.id}",
        )

        return Response(
            TicketCommentSerializer(comment).data, status=status.HTTP_201_CREATED
        )
    
    

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """
        Provides meaningful, correlation-ready analytics for admin/assigners.
        Includes summaries, performance metrics, and time trends.
        """
        user = request.user
        profile = getattr(user, "profile", None)
        if not (getattr(profile, "is_admin_level", False) or getattr(profile, "can_assign", False)):
            return Response({"error": "Not authorized to view analytics."}, status=403)

        tickets = Ticket.objects.select_related("location").prefetch_related("assignments")

        # --------------------------------------------------
        # 1️⃣ Summary Counts
        # --------------------------------------------------
        total_tickets = tickets.count()
        resolved_count = tickets.filter(status=Ticket.Status.RESOLVED).count()
        open_count = tickets.exclude(
            status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED, Ticket.Status.CANCELLED]
        ).count()
        completion_rate = round((resolved_count / total_tickets) * 100, 2) if total_tickets else 0

        # --------------------------------------------------
        # 2️⃣ Time-based Trends (Monthly)
        # --------------------------------------------------
        monthly_trend = (
            tickets.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        # --------------------------------------------------
        # 3️⃣ Resolution Performance (avg duration for resolved tickets)
        # --------------------------------------------------
        # ⚠️ Some models don’t have resolved_at — use updated_at as fallback
        if hasattr(Ticket, "resolved_at"):
            duration_expr = ExpressionWrapper(
                F("resolved_at") - F("created_at"), output_field=DurationField()
            )
            resolved_qs = tickets.filter(resolved_at__isnull=False)
        else:
            duration_expr = ExpressionWrapper(
                F("updated_at") - F("created_at"), output_field=DurationField()
            )
            resolved_qs = tickets.filter(status=Ticket.Status.RESOLVED)

        avg_resolution = resolved_qs.annotate(duration=duration_expr).aggregate(avg_time=Avg("duration"))
        avg_resolution_hours = (
            round(avg_resolution["avg_time"].total_seconds() / 3600, 2)
            if avg_resolution["avg_time"]
            else None
        )

        # --------------------------------------------------
        # 4️⃣ Top Locations & Categories
        # --------------------------------------------------
        top_locations = (
            tickets.values("location__building_name")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )
        top_categories = (
            tickets.values("category")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # --------------------------------------------------
        # 5️⃣ Fixer Performance (resolved tickets per user)
        # --------------------------------------------------
        fixer_stats = (
            resolved_qs.values("assignments__user__email")
            .annotate(
                resolved_count=Count("id"),
                avg_time=Avg(duration_expr),
            )
            .order_by("-resolved_count")
        )
        for fixer in fixer_stats:
            if fixer.get("avg_time"):
                fixer["avg_time_hours"] = round(fixer["avg_time"].total_seconds() / 3600, 2)
            fixer.pop("avg_time", None)

        # --------------------------------------------------
        # 6️⃣ Status Summary
        # --------------------------------------------------
        status_summary = (
            tickets.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )

        # --------------------------------------------------
        # 🧩 Response
        # --------------------------------------------------
        return Response({
            "overview": {
                "total_tickets": total_tickets,
                "resolved": resolved_count,
                "open": open_count,
                "completion_rate": completion_rate,
                "avg_resolution_hours": avg_resolution_hours,
            },
            "status_summary": list(status_summary),
            "monthly_trend": list(monthly_trend),
            "top_locations": list(top_locations),
            "top_categories": list(top_categories),
            "fixer_performance": list(fixer_stats),
        })





# ==================================================
#                  Supporting ViewSets (Read-Only)
# ==================================================
# These provide auxiliary data like locations and roles.
# Relationships:
# - LocationViewSet: Used by TicketViewSet for ticket creation.
# - RoleViewSet: Queried by UserViewSet for role assignment; used in UserProfileView for feature computation.

class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [AllowAny]

class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Returns all roles. Admin-only access.
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]














# ==================================================
#                  User Profile & Auth (Session Management)
# ==================================================
# UserProfileView: Provides current user capabilities/features.
# Auth Views: Handle login, refresh, verification, password reset, logout.
# Relationships:
# - UserProfileView: Depends on UserViewSet for profile data; informs TicketViewSet permissions.
# - Auth Views: Integrate with UserViewSet for registration/invites; use AuditLog for events.
# - All use JWT for authentication, with cookie-based refresh for security.


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Retrieve the currently logged-in user's profile and permissions.
        """
        profile = UserProfile.objects.select_related("user", "role").get(user=request.user)
        features = []

        if profile.can_report:
            features.extend(["canReport", "myReports", "notifications"])
        if profile.can_fix:
            features.extend(["assignedTickets", "uploadProof", "updateStatus", "workHistory"])
        if profile.can_assign:
            features.extend(["overview", "assignTickets", "reviewProof", "escalate"])
        if profile.can_manage_users:
            features.append("manageUsers")
        if profile.is_admin_level:
            features.extend(["reportsView", "escalate", "closeTickets"])

        # System-level roles get extra features
        if profile.role and profile.role.name.lower() in ["super admin", "university admin"]:
            features.extend(["systemSettings", "aiReports"])

        # Remove duplicates while preserving order
        features = list(dict.fromkeys(features))

        # Include student data if user has a StudentProfile
        student_data = None
        student_profile = getattr(profile, "student_profile", None)
        if student_profile:
            student_data = {
                "student_id": student_profile.student_id,
                "course_code": student_profile.course_code,
                "course_name": student_profile.course_name,
                "course": f"{student_profile.course_code or ''} - {student_profile.course_name or ''}".strip(" -"),
                "year_level": student_profile.year_level,
                "section": student_profile.section,
                "college": student_profile.college,
                "enrollment_year": student_profile.enrollment_year,
            }

        return Response({
            "id": request.user.id,
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "full_name": f"{request.user.first_name} {request.user.last_name}".strip(),
            "role": {
                "id": profile.role.id if profile.role else None,
                "name": profile.role.name if profile.role else None,
                "description": profile.role.description if profile.role else None,
            },
            "is_email_verified": profile.is_email_verified,
            "can_fix": profile.can_fix,
            "can_assign": profile.can_assign,
            "can_manage_users": profile.can_manage_users,
            "is_admin_level": profile.is_admin_level,
            "features": features,
            "allowed_categories": profile.allowed_categories(),
            "student_profile": student_data,
        })

    def patch(self, request):
        """
        Allow updating the user's profile and student info.
        """
        try:
            profile = UserProfile.objects.select_related("user").get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        user = profile.user

        # --- Update user fields ---
        user.first_name = data.get("first_name", user.first_name)
        user.last_name = data.get("last_name", user.last_name)
        user.email = data.get("email", user.email)
        user.save()

        # --- Update profile fields ---
        role_id = data.get("role_id")
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
                profile.role = role
            except Role.DoesNotExist:
                return Response({"error": "Invalid role ID."}, status=status.HTTP_400_BAD_REQUEST)

        if "is_email_verified" in data:
            profile.is_email_verified = data.get("is_email_verified", profile.is_email_verified)
        profile.save()

        # --- Update or create student profile ---
        student_data = data.get("student_profile")
        if student_data:
            sp, _ = StudentProfile.objects.get_or_create(user_profile=profile)
            sp.student_id = student_data.get("student_id", sp.student_id)
            sp.course_code = student_data.get("course_code", sp.course_code)
            sp.course_name = student_data.get("course_name", sp.course_name)
            sp.year_level = student_data.get("year_level", sp.year_level)
            sp.section = student_data.get("section", sp.section)
            sp.college = student_data.get("college", sp.college)
            sp.enrollment_year = student_data.get("enrollment_year", sp.enrollment_year)
            sp.save()

        return Response({"detail": "Profile updated successfully."}, status=status.HTTP_200_OK)













class EmailLoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # Call parent JWT view first
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            data = response.data
            access = data.get("access")
            refresh = data.get("refresh")

            if not access or not refresh:
                return Response(
                    {"error": "Authentication failed"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            cookie_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
            secure_flag = not settings.DEBUG

            email = request.data.get("email")
            try:
                user = User.objects.get(email=email)

                # ✅ Update last_login on successful JWT login
                update_last_login(None, user)

                profile, created = UserProfile.objects.get_or_create(user=user)

                if created:
                    # ✅ Assign default role
                    if user.is_superuser:
                        profile.role, _ = Role.objects.get_or_create(name="University Admin")
                        profile.is_email_verified = True
                    else:
                        default_role, _ = Role.objects.get_or_create(name="Student")
                        profile.role = profile.role or default_role
                    profile.save()

                serialized_profile = UserProfileSerializer(profile).data

                response = Response(
                    {
                        "access": access,
                        "profile": serialized_profile,
                    },
                    status=status.HTTP_200_OK,
                )
                response.set_cookie(
                    key="refresh_token",
                    value=refresh,
                    httponly=True,
                    secure=secure_flag,
                    samesite="Strict",
                    max_age=cookie_max_age,
                )

                # ✅ Audit log
                create_audit(
                    "Login",
                    performed_by=user,
                    target_user=user,
                    details="User logged in",
                )

            except User.DoesNotExist:
                return Response(
                    {"error": "User not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        return response

class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # 🔹 Get refresh token from HttpOnly cookie
        refresh = request.COOKIES.get("refresh_token")
        if not refresh:
            return Response(
                {"error": "No refresh token provided"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Inject refresh into request data for TokenRefreshView
        data = request.data.copy()
        data["refresh"] = refresh
        request._full_data = data

        try:
            response = super().post(request, *args, **kwargs)
        except (InvalidToken, TokenError):
            return Response(
                {"error": "Invalid or expired refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # 🔹 If refresh successful
        if response.status_code == 200 and "access" in response.data:
            new_access = response.data["access"]

            # Remove refresh from JSON body (security)
            if "refresh" in response.data:
                del response.data["refresh"]

            # Set new refresh cookie if rotation is enabled
            new_refresh = response.data.get("refresh")
            if new_refresh:
                cookie_max_age = int(
                    settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
                )
                response.set_cookie(
                    key="refresh_token",
                    value=new_refresh,
                    httponly=True,
                    secure=not settings.DEBUG,  # only HTTPS in production
                    samesite="Strict",
                    max_age=cookie_max_age,
                )

            # ✅ Attach profile info (safe serialization)
            try:
                user = request.user
                if not user or not user.is_authenticated:
                    # fallback: extract user_id from refresh token
                    from rest_framework_simplejwt.tokens import RefreshToken
                    token = RefreshToken(refresh)
                    user_id = token["user_id"]
                    user = User.objects.get(id=user_id)

                profile, _ = UserProfile.objects.get_or_create(user=user)
                serialized_profile = UserProfileSerializer(profile).data  # ✅ Role safely nested

                response.data = {
                    "access": new_access,
                    "profile": serialized_profile,
                    "message": "Access token refreshed successfully",
                }
            except Exception as e:
                response.data = {
                    "access": new_access,
                    "message": f"Access token refreshed successfully (profile error: {str(e)})",
                }

        return response

class VerifyEmailView(APIView):
    """
    Endpoint to verify user email via GET link:
    Frontend URL: /verify-email/<uidb64>/<token>
    """
    permission_classes = []  # public

    def get(self, request, uidb64, token):
        if not uidb64 or not token:
            return Response(
                {"error": "Invalid verification link."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            uid_decoded = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid_decoded)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response(
                {"error": "Invalid verification link."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Check token validity
        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "Verification link is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Activate account and mark email verified
        user.is_active = True
        user.save()

        # ✅ Update or create user profile
        profile, created = UserProfile.objects.get_or_create(user=user)
        if not profile.is_email_verified:
            profile.is_email_verified = True
            profile.save()

        # ✅ Audit log
        create_audit(
            action="Email Verification",
            performed_by=user,
            target_user=user,
            details="User verified their email"
        )

        # ✅ Return full serialized profile
        profile_data = UserProfileSerializer(profile).data

        return Response(
            {
                "message": "Email verified successfully.",
                "profile": profile_data
            },
            status=status.HTTP_200_OK
        )

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Email required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists
            return Response(
                {"message": "If account exists, a reset email will be sent."},
                status=status.HTTP_200_OK
            )

        # Encode user ID
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        # Generate password reset token
        token = default_token_generator.make_token(user)
        # Construct reset link pointing to frontend
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

        # Send password reset email
        send_mail(
            subject="Password Reset",
            message=f"Click the link to reset your password:\n{reset_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )

        return Response(
            {"message": "If account exists, a reset email will be sent."},
            status=status.HTTP_200_OK
        )

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        try:
            # Decode user ID from URL
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Invalid reset link"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check token validity
        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "Invalid or expired reset link"},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_password = request.data.get("password")
        if not new_password:
            return Response(
                {"error": "Password required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Set the new password securely
        user.set_password(new_password)
        user.save()

        # Optional: log event if you have auditing in place
        try:
            create_audit(
                "Password Reset",
                performed_by=user,
                target_user=user,
                details="Password reset successfully"
            )
        except NameError:
            # Skip if create_audit isn't defined
            pass

        return Response(
            {"message": "Password has been reset successfully"},
            status=status.HTTP_200_OK
        )

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        refresh_token = request.COOKIES.get("refresh_token")

        if refresh_token:
            try:
                # ✅ Blacklist the refresh token if app has blacklist app enabled
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # If blacklist app is not configured, ignore
                pass

        # ✅ Build response
        response = Response(
            {"message": "Logged out successfully"},
            status=status.HTTP_200_OK,
        )

        # ✅ Delete refresh cookie (only key, path/domain if needed)
        response.delete_cookie(
            "refresh_token",
            path="/",          # match how you set it
            domain=None,       # set if you used a domain in set_cookie()
        )

        # ✅ Audit log
        try:
            create_audit(
                "Logout",
                performed_by=user,
                target_user=user,
                details="User logged out",
            )
        except Exception:
            # Audit logging shouldn’t crash logout
            pass

        return response











# ==================================================
#                  Audit Logs (Monitoring)
# ==================================================
# Provides read-only access to logs for admins.
# Relationships:
# - Logs actions from all other views (UserViewSet, TicketViewSet, Auth views).
# - No direct dependencies; used for compliance/auditing.

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Returns all audit logs. Admin only.
    """
    queryset = AuditLog.objects.all().order_by("-timestamp")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

# Alternative: Simple APIView for audit logs
class AuditLogsAPIView(APIView):
    """
    GET /api/audit-logs/
    Admin-only: returns all audit logs
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = AuditLog.objects.all().order_by("-timestamp")
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)