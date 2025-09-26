# ==================== Imports ====================
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

# -------------------- Models --------------------
from core.models import Ticket, AuditLog, UserProfile, Invite, Location, PasswordResetCode

# -------------------- Serializers --------------------
from core.serializers import (
    UserProfileSerializer, InviteSerializer, TicketSerializer,
    EmailTokenObtainPairSerializer, LocationSerializer,
    InviteAcceptSerializer, InviteApproveSerializer,
    TicketResolutionSerializer
)

# -------------------- Tasks --------------------
from core.tasks import check_escalation

# -------------------- Throttles --------------------
from core.throttles import OTPThrottle, PasswordResetThrottle

# -------------------- Helpers --------------------
from core.utils.audit import create_audit
from core.utils.email_utils import deliver_code
from core.utils.security import generate_otp

from core.models import TicketAssignment


# ✅ Always reference the active User model
User = get_user_model()



# ==================================================
#                  User Management
# ==================================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]  # ✅ Allow registration/login

    # ---------- Self-service Registration (Students Only) ----------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[OTPThrottle])
    def register_self_service(self, request):
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        course = request.data.get('course')
        year_level = request.data.get('year_level')
        student_id = request.data.get('student_id')

        # ✅ Require all fields
        if not all([first_name, last_name, email, password, confirm_password, course, year_level, student_id]):
            return Response(
                {'error': 'All fields are required (first_name, last_name, email, password, confirm_password, course, year_level, student_id)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Password confirmation
        if password != confirm_password:
            return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Restrict only to student domains
        domain = email.split('@')[-1]
        valid_domains = ['student.university.edu']  # adjust for your university
        if domain not in valid_domains:
            return Response({'error': 'Use your official student email'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

        # Create inactive user until OTP verified
        user = User.objects.create_user(
            email=email,
            password=password,
            is_active=False,
            first_name=first_name,
            last_name=last_name
        )
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={"role": "Student", "is_email_verified": False}
        )

        # ✅ Create StudentProfile
        from core.models import StudentProfile
        StudentProfile.objects.create(
            profile=profile,
            full_name=f"{first_name} {last_name}",
            course=course,
            year_level=year_level,
            student_id=student_id
        )

        # ✅ Generate & send OTP
        otp_code = generate_otp()
        user.set_otp(otp_code)
        user.save()

        deliver_code(email, "Your OTP Code", f"Your OTP is {otp_code}", "OTP")
        create_audit("User Created", None, user, details=f"Self-service registration for {email}")
        create_audit("OTP Sent", None, user, details=f"OTP sent to {email}")

        return Response({'message': 'User created. OTP sent.'}, status=status.HTTP_201_CREATED)

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

        # ✅ OTP expiry check (5 minutes)
        if not user.otp_created_at or timezone.now() > user.otp_created_at + timezone.timedelta(minutes=5):
            user.clear_otp()
            user.save()
            create_audit("OTP Expired", None, user, details=f"Expired OTP for {email}")
            return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_otp(otp):
            create_audit("OTP Failed", None, user, details=f"Invalid OTP attempt for {email}")
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Activate user
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

        # ✅ Allow only staff-type roles (exclude students, faculty registering themselves)
        valid_roles = [r[0] for r in UserProfile.ROLE_CHOICES if r[0] not in ['Student']]
        if role not in valid_roles:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Prevent duplicate invites
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
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[PasswordResetThrottle])
    def reset_password_request(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        # ✅ Invalidate old codes
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)

        reset_code = PasswordResetCode.objects.create(user=user)
        deliver_code(email, "Password Reset Code", f"Your reset code is {reset_code.code}", "Reset Code")
        create_audit("Password Reset Requested", None, user, details=f"Password reset code for {user.email}")

        return Response({"message": "Password reset code sent"}, status=status.HTTP_200_OK)

    # ---------- Password Reset (Confirm) ----------
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

        reset_qs = PasswordResetCode.objects.filter(user=user, code=code, is_used=False).order_by('-created_at')
        if not reset_qs.exists():
            return Response({"error": "Invalid or already used code"}, status=status.HTTP_400_BAD_REQUEST)

        reset_code = reset_qs.first()
        if reset_code.is_expired():
            return Response({"error": "Reset code expired"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        reset_code.mark_used()

        create_audit("Password Reset Confirmed", user, user, details=f"Password reset successful for {user.email}")
        return Response({"message": "Password has been reset successfully"}, status=status.HTTP_200_OK)

# ==================================================
#                  Ticket Management
# ==================================================


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    # -------------------- Create / Report --------------------
    @action(detail=False, methods=['post'])
    def report_issue(self, request):
        if not request.user.profile.can_report:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data['reporter'] = request.user.id
        serializer = TicketSerializer(data=data, context={'request': request})
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

        if not assignee.profile.can_fix or ticket.category not in assignee.profile.allowed_categories():
            return Response({'error': 'User cannot be assigned this ticket'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Create assignment record
        assignment = TicketAssignment.objects.create(ticket=ticket, user=assignee)

        ticket.status = "Assigned"
        ticket.save()

        create_audit(
            AuditLog.Action.TICKET_ASSIGNED,
            performed_by=request.user,
            target_user=assignee,
            details=f"Ticket {ticket.id} assigned to {assignee.email}"
        )

        return Response({'message': f'Ticket {ticket.id} assigned to {assignee.email}'})

    # -------------------- Close --------------------
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        ticket = self.get_object()

        if not request.user.profile.can_close_tickets:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if ticket.status == "Closed":
            return Response({'error': 'Ticket already closed'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = "Closed"
        ticket.save()

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
            resolution = serializer.save(ticket=ticket, resolved_by=request.user)
            ticket.status = "Resolved"
            ticket.save()

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

        if ticket.status != "Closed":
            return Response({'error': 'Only closed tickets can be reopened'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = "Reopened"
        ticket.save()

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
#                  User Profile (Dynamic Features + Student Profile)
# ==================================================
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import UserProfile


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.get(user=request.user)

        # Build features dynamically from RBAC rules in the model
        features = []

        # ✅ Everyone can report
        if profile.can_report:
            features.append("canReport")
            features.append("myReports")
            features.append("notifications")

        # ✅ Fixer roles
        if profile.can_fix:
            features.extend([
                "assignedTickets",
                "uploadProof",
                "updateStatus",
                "workHistory",
            ])

        # ✅ Assignment capability
        if profile.can_assign:
            features.extend([
                "overview",
                "assignTickets",
                "reviewProof",
                "escalate",
            ])

        # ✅ User management
        if profile.can_manage_users:
            features.append("manageUsers")

        # ✅ Admin-level actions
        if profile.is_admin_level:
            features.extend([
                "reportsView",
                "escalate",
                "closeTickets",
            ])

        # ✅ Super / University admins
        if profile.role.lower() in ["super admin", "university admin"]:
            features.extend([
                "systemSettings",
                "aiReports",
            ])

        # Remove duplicates while keeping order
        features = list(dict.fromkeys(features))

        # ✅ Student profile details (if exists)
        student_data = None
        if hasattr(profile, "student_profile"):
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
            "role": profile.role,  # original case for display
            "is_email_verified": profile.is_email_verified,
            "features": features,
            "allowed_categories": profile.allowed_categories(),
            "student_profile": student_data,
        })


# ==================================================
#                  Auth
# ==================================================


# Try importing create_audit (safe fallback if missing)
try:
    from .utils import create_audit
except ImportError:
    def create_audit(*args, **kwargs):
        # fallback no-op if utils.create_audit is not defined
        pass





class EmailLoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            data = response.data
            access = data.get("access")
            refresh = data.get("refresh")

            if not access or not refresh:
                return Response(
                    {"error": "Authentication failed"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            cookie_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
            secure_flag = not settings.DEBUG

            # ✅ Reset response so we can control return payload
            response = Response({"access": access}, status=status.HTTP_200_OK)
            response.set_cookie(
                key="refresh_token",
                value=refresh,
                httponly=True,
                secure=secure_flag,
                samesite="Strict",
                max_age=cookie_max_age,
            )

            email = request.data.get("email")
            try:
                user = User.objects.get(email=email)
                profile, created = UserProfile.objects.get_or_create(user=user)

                if created:
                    # ✅ Default roles if missing
                    if user.is_superuser:
                        profile.role = "University Admin"
                        profile.is_email_verified = True
                    else:
                        profile.role = profile.role or "Student"
                    profile.save()

                # ✅ Add serialized profile to response
                serialized_profile = UserProfileSerializer(profile).data
                response.data = {
                    "access": access,
                    "profile": serialized_profile,
                }

                # ✅ Audit log
                create_audit(
                    "Login",
                    performed_by=user,
                    target_user=user,
                    details="User logged in"
                )

            except User.DoesNotExist:
                pass

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

            # ✅ Attach profile info (same as login)
            try:
                user = request.user
                if not user or not user.is_authenticated:
                    # fallback: get user from refresh token's sub
                    from rest_framework_simplejwt.tokens import RefreshToken
                    token = RefreshToken(refresh)
                    user_id = token["user_id"]
                    user = User.objects.get(id=user_id)

                profile, _ = UserProfile.objects.get_or_create(user=user)
                serialized_profile = UserProfileSerializer(profile).data

                response.data = {
                    "access": new_access,
                    "profile": serialized_profile,
                    "message": "Access token refreshed successfully",
                }
            except Exception:
                response.data = {
                    "access": new_access,
                    "message": "Access token refreshed successfully (no profile found)",
                }

        return response



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

        # ✅ Build responsea
        response = Response(
            {"message": "Logged out successfully"},
            status=status.HTTP_200_OK,
        )

        # ✅ Delete refresh cookie
        response.delete_cookie(
            "refresh_token",
            httponly=True,
            secure=not settings.DEBUG,  # HTTPS only in production
            samesite="Strict" if not settings.DEBUG else "Lax",
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