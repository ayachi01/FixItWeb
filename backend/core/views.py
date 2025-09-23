from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings

# ✅ Always use custom user model
User = get_user_model()

# -------------------- Models --------------------
from .models import (
    UserProfile, Invite, Location, Ticket,
    GuestReport, TicketActionLog, Notification, PasswordResetCode
)

# -------------------- Serializers --------------------
from .serializers import (
    UserProfileSerializer, InviteSerializer, TicketSerializer,
    GuestReportSerializer, NotificationSerializer,
    EmailTokenObtainPairSerializer, LocationSerializer,
    InviteAcceptSerializer, InviteApproveSerializer
)

# -------------------- Tasks --------------------
from .tasks import send_guest_notification, check_escalation

# -------------------- Throttles --------------------
from .throttles import OTPThrottle, PasswordResetThrottle

# -------------------- Helpers --------------------
from .utils.audit import create_audit
from .utils.email_utils import deliver_code
from .utils.security import generate_otp



class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]   # ✅ Default open for registration/login

    # ==================================================
    # ---- Self-service Registration (Students only) ----
    # ==================================================
    @action(detail=False, methods=['post'], permission_classes=[AllowAny], throttle_classes=[OTPThrottle])
    def register_self_service(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Restrict only to student email domains
        domain = email.split('@')[-1]
        valid_domains = ['student.university.edu']
        if domain not in valid_domains:
            return Response({'error': 'Use your official student email'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

        # Create inactive user until OTP verified
        user = User.objects.create_user(email=email, password=password, is_active=False)
        UserProfile.objects.get_or_create(user=user, defaults={"role": "Student", "is_email_verified": False})

        # ✅ Generate & store OTP
        otp_code = generate_otp()
        user.set_otp(otp_code)
        user.save()

        deliver_code(email, "Your OTP Code", f"Your OTP is {otp_code}", "OTP")
        create_audit("User Created", None, user, details=f"Self-service registration for {email}")
        create_audit("OTP Sent", None, user, details=f"OTP sent to {email}")

        return Response({'message': 'User created. OTP sent.'}, status=status.HTTP_201_CREATED)

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

        # ✅ Check OTP validity (5 min expiry)
        if not user.otp_created_at or timezone.now() > user.otp_created_at + timezone.timedelta(minutes=5):
            user.clear_otp()
            user.save()
            create_audit("OTP Expired", None, user, details=f"Expired OTP for {email}")
            return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_otp(otp):
            create_audit("OTP Failed", None, user, details=f"Invalid OTP attempt for {email}")
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Success → activate user
        user.is_active = True
        user.clear_otp()
        user.save()

        profile = user.profile
        profile.is_email_verified = True
        profile.save()

        create_audit("OTP Verified", user, user, details=f"OTP verified, account activated for {email}")
        return Response({'message': 'Email verified, account activated. You can now log in.'})

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

    # ==================================================
    # ---- Invite Flow (Controlled Staff Registration) ----
    # ==================================================
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_invite(self, request):
        if not request.user.profile.can_manage_users:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        role = request.data.get('role')

        # ✅ Only allow staff-type roles
        valid_roles = [r[0] for r in UserProfile.ROLE_CHOICES if r[0] not in ['Student', 'Faculty', 'Visitor']]
        if role not in valid_roles:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Prevent duplicate active invites
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

    # 🔹 Case 1: Accept invite via URL /api/users/{uuid}/accept_invite/
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

        serializer = InviteAcceptSerializer(
            invite, data={'password': password}, context={'request': request}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()  # ⚡ Now returns a User

        create_audit("Invite Accepted", user, target_invite=invite, details=f"Invite accepted for {invite.email}")
        return Response({'message': 'Account created successfully'}, status=status.HTTP_201_CREATED)

    # 🔹 Case 2: Accept invite via body /api/users/accept_invite/ { "token": "...", "password": "..." }
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

        serializer = InviteAcceptSerializer(
            invite, data={'password': password}, context={'request': request}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()  # ⚡ Now returns a User

        create_audit("Invite Accepted", user, target_invite=invite, details=f"Invite accepted for {invite.email}")
        return Response({'message': 'Account created successfully'}, status=status.HTTP_201_CREATED)

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

        serializer = InviteApproveSerializer(
            invite, data={'is_approved': True}, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        create_audit("Invite Approved", request.user, target_invite=invite, details=f"Invite approved for {invite.email}")
        return Response({'message': 'Invite approved. User may now accept the invite.'}, status=status.HTTP_200_OK)

    # ==================================================
    # ---- Password Reset ----
    # ==================================================
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

# -------------------- TicketViewSet --------------------
class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def report_issue(self, request):
        if not request.user.profile.can_report():
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data['reporter'] = request.user.id
        serializer = TicketSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            ticket = serializer.save()
            TicketActionLog.objects.create(ticket=ticket, action='Created', performed_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        if not request.user.profile.can_assign():
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        assignee_id = request.data.get('assignee_id')
        try:
            assignee = User.objects.get(id=assignee_id)
        except User.DoesNotExist:
            return Response({'error': 'Invalid assignee'}, status=status.HTTP_400_BAD_REQUEST)

        if not assignee.profile.can_fix() or ticket.category not in assignee.profile.allowed_categories():
            return Response({'error': 'User cannot be assigned this ticket'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.assigned_to = assignee
        ticket.status = "Assigned"
        ticket.save()

        TicketActionLog.objects.create(ticket=ticket, action='Assigned', performed_by=request.user)
        return Response({'message': f'Ticket assigned to {assignee.email}'})


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
            "can_manage_users": profile.can_manage_users,
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
            secure_flag = not settings.DEBUG  # ✅ True in production (HTTPS), False in dev

            response = Response({"access": access}, status=status.HTTP_200_OK)
            response.set_cookie(
                key="refresh_token",
                value=refresh,
                httponly=True,
                secure=secure_flag,
                samesite="Strict",  # ✅ same as LogoutView
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

                # 🔐 Audit: record login event
                create_audit("Login", performed_by=user, target_user=user, details="User logged in")

            except User.DoesNotExist:
                pass

        return response


# -------------------- Cookie-based Token Refresh --------------------
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get("refresh_token")
        if not refresh:
            return Response(
                {"error": "No refresh token provided"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        data = request.data.copy()
        data["refresh"] = refresh
        request._full_data = data

        try:
            response = super().post(request, *args, **kwargs)
        except (InvalidToken, TokenError):
            return Response(
                {"error": "Invalid or expired refresh token"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if response.status_code == 200 and "access" in response.data:
            response.data["message"] = "Access token refreshed successfully"

            # ✅ If SimpleJWT issued a new refresh token, re-set cookie
            new_refresh = response.data.get("refresh")
            if new_refresh:
                cookie_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
                response.set_cookie(
                    key="refresh_token",
                    value=new_refresh,
                    httponly=True,
                    secure=not settings.DEBUG,  # ✅ HTTPS in production
                    samesite="Strict",
                    max_age=cookie_max_age,
                )

            # 🔐 Audit: record refresh event
            if request.user.is_authenticated:
                create_audit(
                    "Token Refreshed",
                    performed_by=request.user,
                    target_user=request.user,
                    details="Access token refreshed"
                )

        return response


# -------------------- Logout --------------------

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            user = request.user  # capture before logout

            # 🚨 Blacklist refresh token if token blacklisting is enabled
            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()  # requires SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] = True
                except Exception:
                    # If blacklist app not enabled, just ignore
                    pass

            # ✅ Clear cookie on client (secure + strict in production)
            response = Response(
                {"message": "Logged out successfully"},
                status=status.HTTP_200_OK
            )
            response.delete_cookie(
                "refresh_token",
                httponly=True,
                secure=not settings.DEBUG,  # ✅ HTTPS in production
                samesite="Strict",          # ✅ stronger CSRF protection
            )

            # 🔐 Audit: record logout event
            create_audit("Logout", performed_by=user, target_user=user, details="User logged out")

            return response

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
