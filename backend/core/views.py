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

from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
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
    DomainRoleMapping,   # ✅ Added here so Pylance recognizes it
)

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
    InviteApproveSerializer,
    TicketResolutionSerializer,
)

# -------------------- Tasks --------------------
from core.tasks import check_escalation

# -------------------- Throttles --------------------
from core.throttles import OTPThrottle, PasswordResetThrottle

# -------------------- Helpers --------------------
from core.utils.audit import create_audit
from core.utils.email_utils import deliver_code, send_verification_email
from core.utils.security import generate_otp

from django.contrib.auth.models import update_last_login



# ==================================================
#                  User Management
# ==================================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.select_related("user").all()
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]  # allow registration/login

    def get_queryset(self):
        """
        Supports filters:
          ?can_fix=true, ?can_assign=true, ?role=Maintenance Officer
        Always returns UserProfile objects.
        """
        qs = UserProfile.objects.select_related("user").all()

        can_fix = self.request.query_params.get("can_fix")
        can_assign = self.request.query_params.get("can_assign")
        role = self.request.query_params.get("role")

        if can_fix is not None:
            if can_fix.lower() == "true":
                qs = [p for p in qs if p.can_fix]
            elif can_fix.lower() == "false":
                qs = [p for p in qs if not p.can_fix]

        if can_assign is not None:
            if can_assign.lower() == "true":
                qs = [p for p in qs if p.can_assign]
            elif can_assign.lower() == "false":
                qs = [p for p in qs if not p.can_assign]

        if role:
            qs = [p for p in qs if p.role.lower() == role.lower()]

        if isinstance(qs, list):  # convert back to queryset
            ids = [p.id for p in qs]
            qs = UserProfile.objects.filter(id__in=ids).select_related("user")

        return qs

    # ---------- Email Login ----------
    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def email_login(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({"error": "Email and password required"}, status=400)

        user = authenticate(request, email=email, password=password)
        if not user:
            create_audit("Login Failed", None, None, details=f"Failed login attempt for {email}")
            return Response({"error": "Invalid credentials"}, status=401)

        if not user.is_active:
            return Response({"error": "Account not active"}, status=403)

        # ✅ Update last_login field when user logs in
        from django.contrib.auth.models import update_last_login
        update_last_login(None, user)

        refresh = RefreshToken.for_user(user)
        profile_data = UserProfileSerializer(user.profile).data

        create_audit("Login Success", user, user, details=f"Successful login for {email}")

        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh), "profile": profile_data},
            status=200
        )


    # ---------- Unified Self-service Registration (Students + Faculty + Staff + Visitors) ----------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register_self_service(self, request):
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')

        print("📩 Incoming registration request:", request.data)  # DEBUG

        # === Validation: basic fields ===
        if not all([first_name, last_name, email, password, confirm_password]):
            return Response(
                {'error': 'All fields are required (first_name, last_name, email, password, confirm_password)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password != confirm_password:
            return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

        # === Normalize and extract domain ===
        domain = email.split('@')[-1].strip().lower()
        print(f"🌐 Extracted normalized domain: {domain}")  # DEBUG

        # === Role assignment via DomainRoleMapping ===
        mapping = DomainRoleMapping.objects.filter(domain__iexact=domain).first()
        if mapping:
            role = mapping.role
            print(f"✅ Domain mapping found: {domain} → Role = {role.name} (id={role.id})")  # DEBUG
        else:
            role, _ = Role.objects.get_or_create(
                name="Visitor",
                defaults={"description": "Unmapped domain"}
            )
            print(f"⚠️ No mapping found for {domain}. Defaulting to Visitor (id={role.id})")  # DEBUG

        # === Extra validation if Student ===
        if role.name == "Student":
            course = request.data.get('course')
            year_level = request.data.get('year_level')
            student_id = request.data.get('student_id')

            print("🎓 Student registration detected")  # DEBUG
            print(f"   course={course}, year_level={year_level}, student_id={student_id}")  # DEBUG

            if not all([course, year_level, student_id]):
                return Response(
                    {'error': 'Students must provide course, year_level, and student_id'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # === Check for duplicate email ===
        if User.objects.filter(email=email).exists():
            print(f"⛔ Email already registered: {email}")  # DEBUG
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

        # === Create user (inactive until email verified) ===
        user = User.objects.create_user(
            email=email,
            password=password,
            is_active=False,  # 🚫 user cannot log in yet
            first_name=first_name,
            last_name=last_name
        )
        print(f"👤 User created: {user.email} (id={user.id})")  # DEBUG

        # === Create or update user profile ===
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={"role": role, "is_email_verified": False}  # 🚫 always false until verification
        )
        if created:
            print(f"🆕 UserProfile created with role={role.name} (id={role.id})")  # DEBUG
        else:
            print(f"♻️ UserProfile already exists. Updating role to {role.name} (id={role.id})")  # DEBUG
            profile.role = role
            profile.is_email_verified = False  # 🚫 force false on re-register
            profile.save()

        # === If student, create student profile record ===
        if role.name == "Student":
            student_profile = StudentProfile.objects.create(
                user_profile=profile,
                student_id=student_id,
                course_code=course,
                year_level=year_level
            )
            print(f"🎓 StudentProfile created for {user.email} (student_id={student_profile.student_id})")  # DEBUG

        # === Generate verification link ===
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"http://localhost:5173/verify-email/{uidb64}/{token}/"
        print(f"🔗 Verification link generated for {user.email}: {verify_url}")  # DEBUG

        deliver_code(
            email,
            "Verify your account",
            f"Click the link to verify your email: {verify_url}",
            "LINK"
        )
        print(f"📧 Verification link sent to {email}")  # DEBUG

        # === Audit logs ===
        create_audit("User Created", None, user, details=f"Self-service registration for {email}")
        create_audit("Verification Link Sent", None, user, details=f"Link sent to {email}")

        # === Explicit Response with Role ===
        return Response({
            "message": "User registered successfully. Please check your email to verify your account.",
            "verification_link": verify_url,
            "profile": {
                "id": profile.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": {
                    "id": role.id,
                    "name": role.name,
                    "description": role.description
                },
                "is_email_verified": False,  # 🚫 always false until verified
                "email_domain": domain,
                "can_fix": profile.can_fix,
                "can_assign": profile.can_assign,
                "can_manage_users": profile.can_manage_users,
                "is_admin_level": profile.is_admin_level,
                "allowed_categories": [],
                "student_profile": getattr(profile, "student_profile", None)
            }
        }, status=status.HTTP_201_CREATED)


    # ---------- Verify OTP ----------
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

        if not user.otp_created_at or timezone.now() > user.otp_created_at + timezone.timedelta(minutes=5):
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
        return Response({'message': 'Email verified, account activated. You can now log in.'})

    # ---------- Resend OTP ----------
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

    # ---------- Invite Flow (Staff Registration) ----------
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_invite(self, request):
        if not request.user.profile.can_manage_users:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        role = request.data.get('role')

        valid_roles = [r[0] for r in UserProfile.Role.choices if r[0] not in ['Student']]
        if role not in valid_roles:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        existing = Invite.objects.filter(email=email, is_used=False).first()
        if existing:
            if existing.expires_at < timezone.now():
                existing.delete()
            else:
                return Response({'error': 'Active invite already exists'}, status=status.HTTP_400_BAD_REQUEST)

        invite = Invite.objects.create(email=email, role=role, created_by=request.user)
        invite_link = f"http://127.0.0.1:8000/api/users/{invite.token}/accept_invite/"

        create_audit("Invite Created", request.user, target_invite=invite, details=f"Invite for {email} ({role})")

        return Response({
            'message': 'Invite created successfully',
            'invite_link': invite_link,
            'expires_at': invite.expires_at,
            'requires_admin_approval': invite.requires_admin_approval
        }, status=status.HTTP_201_CREATED)

    # ---------- Accept Invite ----------
    @action(detail=True, methods=['post'], permission_classes=[AllowAny], url_path="accept_invite")
    def accept_invite(self, request, pk=None):
        token = pk
        password = request.data.get('password')
        if not token or not password:
            return Response({'error': 'Token and password required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invite = Invite.objects.get(token=token)
        except Invite.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InviteAcceptSerializer(invite, data={'password': password}, context={'request': request}, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        create_audit("Invite Accepted", user, target_invite=invite, details=f"Invite accepted for {invite.email}")
        return Response({'message': 'Account created successfully'}, status=status.HTTP_201_CREATED)

    # ---------- Accept Invite (via body) ----------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path="accept_invite")
    def accept_invite_with_token(self, request):
        token = request.data.get('token')
        password = request.data.get('password')
        if not token or not password:
            return Response({'error': 'Token and password required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invite = Invite.objects.get(token=token)
        except Invite.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InviteAcceptSerializer(invite, data={'password': password}, context={'request': request}, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        create_audit("Invite Accepted", user, target_invite=invite, details=f"Invite accepted for {invite.email}")
        return Response({'message': 'Account created successfully'}, status=status.HTTP_201_CREATED)

    # ---------- Approve Invite ----------
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def approve_invite(self, request):
        if request.user.profile.role != 'University Admin':
            return Response({'error': 'Only University Admin can approve invites'}, status=status.HTTP_403_FORBIDDEN)

        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invite = Invite.objects.get(token=token, requires_admin_approval=True, is_used=False)
        except Invite.DoesNotExist:
            return Response({'error': 'Invalid or already processed invite'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InviteApproveSerializer(invite, data={'is_approved': True}, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        create_audit("Invite Approved", request.user, target_invite=invite, details=f"Invite approved for {invite.email}")
        return Response({'message': 'Invite approved. User may now accept the invite.'}, status=status.HTTP_200_OK)

        # ---------- Password Reset (Request) ----------
    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        throttle_classes=[PasswordResetThrottle]
    )
    def reset_password_request(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        # Invalidate old codes
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)

        # Create a fresh code
        reset_code = PasswordResetCode.objects.create(user=user)

        # Deliver via email
        deliver_code(
            email,
            "Password Reset Code",
            f"Your reset code is {reset_code.code}",
            "Reset Code"
        )

        # Log audit
        create_audit(
            "Password Reset Requested",
            performed_by=None,
            target_user=user,
            details=f"Password reset code for {user.email}"
        )

        return Response({"message": "Password reset code sent"}, status=status.HTTP_200_OK)


    # ---------- Password Reset (Confirm via Code) ----------
    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        throttle_classes=[PasswordResetThrottle]
    )
    def reset_password_confirm(self, request):
        email = request.data.get("email")
        code = request.data.get("code")                # ✅ use "code" instead of "otp"
        new_password = request.data.get("new_password")  # ✅ use "new_password" instead of "password"

        if not email or not code or not new_password:
            return Response(
                {"error": "Email, code, and new_password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid email or code"}, status=status.HTTP_400_BAD_REQUEST)

        reset_qs = PasswordResetCode.objects.filter(user=user, code=code, is_used=False).order_by('-created_at')
        if not reset_qs.exists():
            return Response({"error": "Invalid or already used code"}, status=status.HTTP_400_BAD_REQUEST)

        reset_code = reset_qs.first()
        if reset_code.is_expired():
            return Response({"error": "Code expired"}, status=status.HTTP_400_BAD_REQUEST)

        # Set new password
        user.set_password(new_password)
        user.save()
        reset_code.mark_used()

        create_audit(
            "Password Reset Confirmed",
            performed_by=user,
            target_user=user,
            details=f"Password reset successful for {user.email}"
        )

        return Response({"message": "Password has been reset successfully"}, status=status.HTTP_200_OK)


# ==================================================
#                  Ticket Management
# ==================================================

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    # -------------------- Assigned Tickets --------------------
    @action(detail=False, methods=['get'])
    def assigned(self, request):
        user = request.user
        tickets = Ticket.objects.filter(assignments__user=user)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)

    # -------------------- Unassigned Tickets --------------------
    @action(detail=False, methods=['get'])
    def unassigned(self, request):
        tickets = Ticket.objects.filter(assignments__isnull=True)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)

    # -------------------- Report Ticket --------------------
    @action(detail=False, methods=['post'])
    def report_issue(self, request):
        if not request.user.profile.can_report:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            ticket = serializer.save()
            create_audit(
                AuditLog.Action.TICKET_CREATED,
                performed_by=request.user,
                details=f"Ticket {ticket.id} created"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # -------------------- Assign --------------------
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        if not request.user.profile.can_assign:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        assignee_id = request.data.get('assignee_id')
        try:
            assignee = User.objects.get(id=assignee_id)
        except User.DoesNotExist:
            return Response({'error': 'Invalid assignee'}, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(assignee, "profile", None)
        if not profile or not profile.can_fix:
            return Response({'error': 'User cannot be assigned tickets'}, status=status.HTTP_400_BAD_REQUEST)

        if ticket.category not in profile.allowed_categories():
            return Response({'error': f'User cannot fix {ticket.category} tickets'}, status=status.HTTP_400_BAD_REQUEST)

        TicketAssignment.objects.get_or_create(ticket=ticket, user=assignee)
        ticket.status = Ticket.Status.ASSIGNED
        ticket.save(update_fields=["status", "updated_at"])

        create_audit(
            AuditLog.Action.TICKET_ASSIGNED,
            performed_by=request.user,
            target_user=assignee,
            details=f"Ticket {ticket.id} assigned to {assignee.email}"
        )
        return Response({'message': f'Ticket {ticket.id} assigned to {assignee.email}'})

    # -------------------- Eligible Fixers --------------------
    @action(detail=True, methods=['get'])
    def eligible_fixers(self, request, pk=None):
        """Return only staff eligible to fix this ticket based on its category"""
        ticket = self.get_object()
        from .models import UserProfile  # avoid circular import

        # ✅ Use the helper method (defined in UserProfile model)
        fixers = UserProfile.fixers_for_category(ticket.category)

        data = [
            {
                "id": f.user.id,
                "email": f.user.email,
                "first_name": f.user.first_name,
                "last_name": f.user.last_name,
                "full_name": f.user.get_full_name() or f.user.username,
                "role": f.role.name if f.role else None,  # ✅ safe serialization
            }
            for f in fixers
        ]
        return Response(data)

    # -------------------- Close --------------------
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        ticket = self.get_object()
        if not request.user.profile.can_close_tickets:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if ticket.status == Ticket.Status.CLOSED:
            return Response({'error': 'Ticket already closed'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = Ticket.Status.CLOSED
        ticket.save(update_fields=["status", "updated_at"])

        create_audit(
            AuditLog.Action.TICKET_CLOSED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} closed"
        )
        return Response({'message': f'Ticket {ticket.id} has been closed successfully'})

    # -------------------- Resolve --------------------
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        if not request.user.profile.can_fix:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TicketResolutionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            resolution = serializer.save(ticket=ticket)
            ticket.status = Ticket.Status.RESOLVED
            ticket.save(update_fields=["status", "updated_at"])

            create_audit(
                AuditLog.Action.TICKET_RESOLVED,
                performed_by=request.user,
                details=f"Ticket {ticket.id} resolved"
            )
            return Response(TicketResolutionSerializer(resolution).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # -------------------- Reopen --------------------
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status != Ticket.Status.CLOSED:
            return Response({'error': 'Only closed tickets can be reopened'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = Ticket.Status.REOPENED
        ticket.save(update_fields=["status", "updated_at"])

        create_audit(
            AuditLog.Action.TICKET_REOPENED,
            performed_by=request.user,
            details=f"Ticket {ticket.id} reopened"
        )
        return Response({'message': f'Ticket {ticket.id} has been reopened'})


# ==================================================
#                  Locations
# ==================================================
class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [AllowAny]


# ==================================================
#                  User Profile
# ==================================================
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
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

        # ✅ Fix: Access role.name instead of role directly
        if profile.role and profile.role.name.lower() in ["super admin", "university admin"]:
            features.extend(["systemSettings", "aiReports"])

        # remove duplicates while preserving order
        features = list(dict.fromkeys(features))

        student_data = None
        if getattr(profile, "student_profile", None):
            sp = profile.student_profile
            student_data = {
                "full_name": sp.full_name,
                "course": sp.course,
                "year_level": sp.year_level,
                "student_id": sp.student_id,
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


# ==================================================
#                  Auth
# ==================================================


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

# ==================================================
#             Forgot Password (send email)
# ==================================================
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




# ==================================================
#                  Reset Password
# ==================================================
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