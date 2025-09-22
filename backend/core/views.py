# core/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from django.core.mail import send_mail
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings

import random

# Models
from .models import (
    StudentRegistration, UserProfile, Invite, Location, Ticket,
    GuestReport, TicketActionLog, Notification, AuditLog,
    PasswordResetCode
)

# Serializers
from .serializers import (
    UserProfileSerializer, InviteSerializer, TicketSerializer,
    GuestReportSerializer, NotificationSerializer,
    StudentRegistrationSerializer, EmailTokenObtainPairSerializer,
    LocationSerializer
)

# Tasks
from .tasks import send_guest_notification, check_escalation

# ✅ Import throttles
from .throttles import OTPThrottle, PasswordResetThrottle

# ✅ Always use custom user model
User = get_user_model()

# -------------------- Audit Helper --------------------
_ALLOWED_AUDIT_ACTIONS = [choice[0] for choice in AuditLog.ACTION_CHOICES]

def create_audit(action: str, performed_by, target_user=None, target_invite=None, details: str = ""):
    """Safely create an AuditLog entry only if action exists in choices."""
    if action in _ALLOWED_AUDIT_ACTIONS:
        AuditLog.objects.create(
            action=action,
            performed_by=performed_by,
            target_user=target_user,
            target_invite=target_invite,
            details=details
        )

# -------------------- Helper: OTP/Reset sender --------------------
def deliver_code(email: str, subject: str, message: str, debug_message: str):
    """Send OTP or reset code via console (DEBUG) or email (PROD)."""
    if getattr(settings, "DEBUG_OTP", True):
        print(f"📌 DEBUG {debug_message} for {email}: {message}")
    else:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])

# -------------------- UserViewSet --------------------
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]   # ✅ Default is open

    # ---- Registration with OTP ----
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[OTPThrottle])
    def register_self_service(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Only enforce domain restriction for self-service registrations
        domain = email.split('@')[-1]
        valid_domains = [
            'student.university.edu'
        ]
        if domain not in valid_domains:
            return Response(
                {'error': 'Please use your official university email address'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(email=email, password=password, is_active=False)
        if not hasattr(user, "profile"):
            UserProfile.objects.create(user=user, is_email_verified=False)

        otp_code = str(random.randint(100000, 999999))
        StudentRegistration.objects.create(
            user=user,
            otp_code=otp_code,
            created_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(minutes=5),
            status="Pending"
        )

        deliver_code(email, "Your OTP Code", f"Your OTP is {otp_code}", "OTP")
        create_audit("User Created", None, user, details=f"Self-service registration for {email}")

        return Response({'message': 'User created. OTP sent (or printed in console if in DEBUG mode).'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[OTPThrottle])
    def verify_otp(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        if not email or not otp:
            return Response({'error': 'Email and OTP required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            registration = StudentRegistration.objects.get(user__email=email)
        except StudentRegistration.DoesNotExist:
            return Response({'error': 'Registration not found'}, status=status.HTTP_404_NOT_FOUND)

        if not registration.is_valid():
            registration.status = "Expired"
            registration.save()
            return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

        if registration.otp_code != otp:
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        registration.status = "Verified"
        registration.save()

        user = registration.user
        user.is_active = True
        user.save()

        profile = user.profile
        profile.is_email_verified = True
        profile.save()

        create_audit("Role Assigned", user, user, details=f"OTP verified for {email}")
        return Response({'message': 'Email verified, account activated. You can now log in.'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[OTPThrottle])
    def resend_otp(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            registration = StudentRegistration.objects.get(user__email=email)
        except StudentRegistration.DoesNotExist:
            return Response({'error': 'Registration not found'}, status=status.HTTP_404_NOT_FOUND)

        if registration.status == "Verified":
            return Response({'error': 'Account already verified'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = str(random.randint(100000, 999999))
        registration.otp_code = otp_code
        registration.created_at = timezone.now()
        registration.expires_at = timezone.now() + timezone.timedelta(minutes=5)
        registration.status = "Pending"
        registration.save()

        deliver_code(email, "Your New OTP Code", f"Your new OTP is {otp_code}", "Resent OTP")
        create_audit("OTP Resent", None, registration.user, details=f"New OTP generated for {email}")

        return Response({'message': 'New OTP resent successfully'}, status=status.HTTP_200_OK)

    # ---- Invite Flow (bypasses domain restriction) ----
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_invite(self, request):
        if request.user.profile.role not in ['Registrar', 'HR', 'University Admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        role = request.data.get('role')
        valid_roles = ['Janitorial Staff', 'Utility Worker', 'IT Support', 'Security Guard', 'Maintenance Officer']
        if role not in valid_roles:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        if Invite.objects.filter(email=email, is_used=False).exists():
            return Response({'error': 'Invite already exists'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ No domain restriction here
        invite = Invite.objects.create(email=email, role=role, created_by=request.user)
        invite_link = f'http://127.0.0.1:8000/api/users/accept_invite/{invite.token}/'

        print(f"📌 DEBUG Invite Link for {email}: {invite_link}")
        create_audit("Invite Created", request.user, target_invite=invite, details=f"Invite for {email} as {role}")

        return Response({'message': 'Invite created, check backend console for link', 'invite_link': invite_link})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def accept_invite(self, request):
        token = request.data.get('token')
        password = request.data.get('password')
        if not token or not password:
            return Response({'error': 'Token and password required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invite = Invite.objects.get(token=token)
        except Invite.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

        if invite.is_used or invite.expires_at < timezone.now():
            return Response({'error': 'Invalid or expired invite'}, status=status.HTTP_400_BAD_REQUEST)
        if invite.requires_admin_approval:
            return Response({'error': 'Invite requires University Admin approval'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ No domain restriction here
        user = User.objects.create_user(email=invite.email, password=password)
        if not hasattr(user, "profile"):
            UserProfile.objects.create(user=user, role=invite.role, is_email_verified=True)

        invite.is_used = True
        invite.save()

        create_audit("Invite Accepted", user, user, details=f"Invite accepted for {invite.email}")
        return Response({'message': 'Account created successfully'})

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
            return Response({'error': 'Invalid or already used invite'}, status=status.HTTP_404_NOT_FOUND)

        invite.requires_admin_approval = False
        invite.save()

        create_audit("Invite Approved", request.user, target_invite=invite, details=f"Invite approved for {invite.email}")
        return Response({'message': 'Invite approved'})

    # ---- Password Reset ----
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[PasswordResetThrottle])
    def reset_password_request(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        reset_code = PasswordResetCode.objects.create(user=user)
        deliver_code(email, "Password Reset Code", f"Your reset code is {reset_code.code}", "Reset Code")
        create_audit("Password Reset Requested", None, user, details=f"Password reset code for {user.email}")

        return Response({"message": "Password reset code sent (or printed in console if in DEBUG mode)"})

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
        return Response({"message": "Password has been reset successfully"})


# -------------------- TicketViewSet --------------------
class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def report_issue(self, request):
        if not request.user.profile.can_report:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data['reporter'] = request.user.id
        serializer = TicketSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            ticket = serializer.save()
            TicketActionLog.objects.create(ticket=ticket, action='Created', performed_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# -------------------- GuestReportViewSet --------------------
class GuestReportViewSet(viewsets.ModelViewSet):
    queryset = GuestReport.objects.all()
    serializer_class = GuestReportSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def report_issue(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            report = serializer.save()
            TicketActionLog.objects.create(guest_report=report, action="Created", performed_by=None)
            send_guest_notification.delay(report.guest_email, report.id, report.tracking_code)
            return Response({"message": "Guest report created", "tracking_code": str(report.tracking_code)}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='track/(?P<tracking_code>[^/.]+)')
    def track(self, request, tracking_code=None):
        try:
            report = GuestReport.objects.get(tracking_code=tracking_code)
            serializer = self.get_serializer(report)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except GuestReport.DoesNotExist:
            return Response({"error": "Invalid tracking code"}, status=status.HTTP_404_NOT_FOUND)

# -------------------- NotificationViewSet --------------------
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

# -------------------- StudentRegistrationViewSet --------------------
class StudentRegistrationViewSet(viewsets.ModelViewSet):
    queryset = StudentRegistration.objects.all()
    serializer_class = StudentRegistrationSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        factory = APIRequestFactory()
        proxy_request = factory.post('/api/users/register_self_service/', request.data)
        proxy_request.user = request.user
        view = UserViewSet.as_view({'post': 'register_self_service'})
        return view(proxy_request)

    @action(detail=False, methods=['post'])
    def verify(self, request):
        factory = APIRequestFactory()
        proxy_request = factory.post('/api/users/verify_otp/', request.data)
        proxy_request.user = request.user
        view = UserViewSet.as_view({'post': 'verify_otp'})
        return view(proxy_request)

# -------------------- LocationViewSet --------------------
class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [AllowAny]

# -------------------- UserProfileView --------------------
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.get(user=request.user)
        return Response({
            "id": request.user.id,
            "username": getattr(request.user, "username", request.user.email),
            "email": request.user.email,
            "role": profile.role,
            "can_report": profile.can_report,
            "can_fix": profile.can_fix,
            "can_assign": profile.can_assign,
            "is_email_verified": profile.is_email_verified,
        })

# -------------------- Email Login --------------------
class EmailLoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        print("🔥 EmailLoginView called with:", request.data)

        # Run SimpleJWT’s built-in authentication
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

            # ✅ Set refresh token in HttpOnly cookie
            cookie_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
            secure_flag = not settings.DEBUG  # True in production, False in dev

            response = Response({"access": access}, status=status.HTTP_200_OK)
            response.set_cookie(
                key="refresh_token",
                value=refresh,
                httponly=True,
                secure=secure_flag,
                samesite="Strict",
                max_age=cookie_max_age,
            )

            # ✅ Ensure UserProfile exists
            email = request.data.get("email")
            try:
                user = User.objects.get(email=email)
                profile, created = UserProfile.objects.get_or_create(user=user)

                if created:
                    if user.is_superuser:
                        profile.role = "University Admin"
                        profile.is_email_verified = True
                    else:
                        profile.role = profile.role or "Student"
                    profile.save()
                    print(f"✅ UserProfile auto-created for {user.email}")
            except User.DoesNotExist:
                pass

        return response

# -------------------- Cookie-based Token Refresh --------------------
class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get("refresh_token")
        if not refresh:
            return Response(
                {"error": "No refresh token"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        data = request.data.copy()
        data["refresh"] = refresh
        request._full_data = data

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200 and "access" in response.data:
            response.data["message"] = "Access token refreshed successfully"

        return response

# -------------------- Logout --------------------
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            # 🚨 Blacklist refresh token if token blacklisting is enabled
            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()  # requires SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] = True
                except Exception:
                    # If blacklist app not enabled, just ignore
                    pass

            # ✅ Clear cookie on client
            response = Response(
                {"message": "Logged out successfully"},
                status=status.HTTP_200_OK
            )
            response.delete_cookie(
                "refresh_token",
                samesite="Lax",
                secure=False,   # ⚠️ set True in production (HTTPS)
                httponly=True,
            )
            return response

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

