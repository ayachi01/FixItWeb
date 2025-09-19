from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.mail import send_mail
from django.utils import timezone
from jose import jwt, JWTError
from pyotp import random_base32, TOTP
from django.contrib.auth import get_user_model
import random
from .serializers import LocationSerializer

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import (
    StudentRegistration, UserProfile, Invite, Location, Ticket,
    GuestReport, TicketImage, TicketActionLog, Notification, AuditLog
)

from .serializers import (
    UserProfileSerializer, InviteSerializer, TicketSerializer,
    GuestReportSerializer, NotificationSerializer,
    StudentRegistrationSerializer, EmailTokenObtainPairSerializer
)

from django.conf import settings
from .tasks import send_guest_notification, check_escalation
import uuid

from rest_framework_simplejwt.views import TokenObtainPairView

# ✅ Always use custom user model
User = get_user_model()

JWT_SECRET = 'your-secret-key'  # Replace with secure key in settings.py


# -------------------- UserViewSet --------------------
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.AllowAny]  # Allow registration without auth

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register_self_service(self, request):
        """Self-service registration for Students, Faculty, Admin Staff with OTP."""
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate email domain
        domain = email.split('@')[-1]
        valid_domains = ['gmail.com', 'student.university.edu', 'faculty.university.edu', 'admin.university.edu']
        if domain not in valid_domains:
            return Response({'error': 'Invalid university email domain'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user exists
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

        # Create user and profile
        user = User.objects.create_user(email=email, password=password)
        profile = UserProfile.objects.create(user=user)
        profile.otp_secret = random_base32()
        profile.save()  # Auto-assigns role based on domain

        # Send OTP
        totp = TOTP(profile.otp_secret, interval=300)
        otp = totp.now()
        send_mail(
            'FixIT OTP Verification',
            f'Your OTP is {otp}. It expires in 5 minutes.',
            'fixit@university.edu',
            [email],
            fail_silently=False,
        )
        AuditLog.objects.create(
            action='User Created',
            performed_by=None,
            target_user=user,
            details=f'Self-service registration for {email} as {profile.role}'
        )
        return Response({'message': 'User created, OTP sent to email'})

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verify_otp(self, request):
        """Verify OTP for self-service registration."""
        email = request.data.get('email')
        otp = request.data.get('otp')
        try:
            user = User.objects.get(email=email)
            profile = user.profile
            totp = TOTP(profile.otp_secret, interval=300)
            if totp.verify(otp):
                profile.is_email_verified = True
                profile.save()
                AuditLog.objects.create(
                    action='User Verified',
                    performed_by=user,
                    target_user=user,
                    details=f'OTP verified for {email}'
                )
                return Response({'message': 'Email verified successfully'})
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def create_invite(self, request):
        """Create invite for controlled registration (Janitors, IT, etc.)."""
        if request.user.profile.role not in ['Registrar', 'HR', 'University Admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        role = request.data.get('role')
        valid_roles = ['Janitorial Staff', 'Utility Worker', 'IT Support', 'Security Guard', 'Maintenance Officer']
        if role not in valid_roles:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        if Invite.objects.filter(email=email, is_used=False).exists():
            return Response({'error': 'Invite already exists for this email'}, status=status.HTTP_400_BAD_REQUEST)

        invite = Invite.objects.create(email=email, role=role, created_by=request.user)
        invite_link = f'http://127.0.0.1:8000/api/users/accept_invite/{invite.token}/'
        send_mail(
            'FixIT Account Invite',
            f'Use this link to set up your account: {invite_link} (Expires in 24 hours)',
            'fixit@university.edu',
            [email],
            fail_silently=False,
        )
        AuditLog.objects.create(
            action='Invite Created',
            performed_by=request.user,
            target_invite=invite,
            details=f'Invite for {email} as {role}'
        )
        return Response({'message': 'Invite sent', 'invite_link': invite_link})

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def accept_invite(self, request):
        """Accept invite and create account for controlled registration."""
        token = request.data.get('token')
        password = request.data.get('password')
        try:
            invite = Invite.objects.get(token=token)
            if invite.is_used or invite.expires_at < timezone.now():
                return Response({'error': 'Invalid or expired invite'}, status=status.HTTP_400_BAD_REQUEST)
            if invite.requires_admin_approval:
                return Response({'error': 'Invite requires University Admin approval'}, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.create_user(email=invite.email, password=password)
            UserProfile.objects.create(user=user, role=invite.role, is_email_verified=True)
            invite.is_used = True
            invite.save()
            AuditLog.objects.create(
                action='Invite Accepted',
                performed_by=user,
                target_user=user,
                details=f'Invite accepted for {invite.email} as {invite.role}'
            )
            return Response({'message': 'Account created successfully'})
        except Invite.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve_invite(self, request):
        """University Admin approves invites for security-sensitive roles."""
        if request.user.profile.role != 'University Admin':
            return Response({'error': 'Only University Admin can approve invites'}, status=status.HTTP_403_FORBIDDEN)

        token = request.data.get('token')
        try:
            invite = Invite.objects.get(token=token, requires_admin_approval=True, is_used=False)
            invite.requires_admin_approval = False
            invite.save()
            AuditLog.objects.create(
                action='Invite Approved',
                performed_by=request.user,
                target_invite=invite,
                details=f'Invite approved for {invite.email} as {invite.role}'
            )
            send_mail(
                'FixIT Invite Approved',
                f'Your invite as {invite.role} has been approved. Use the original link to set up your account.',
                'fixit@university.edu',
                [invite.email],
            )
            return Response({'message': 'Invite approved'})
        except Invite.DoesNotExist:
            return Response({'error': 'Invalid or already used invite'}, status=status.HTTP_404_NOT_FOUND)


# -------------------- TicketViewSet --------------------
class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def report_issue(self, request):
        """Create a ticket with photo proof."""
        if not request.user.profile.can_report:
            return Response({'error': 'Unauthorized to report'}, status=status.HTTP_403_FORBIDDEN)

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
    permission_classes = [permissions.AllowAny]  # Guests don't log in

    @action(detail=False, methods=['post'])
    def report_issue(self, request):
        """Guest submits a new issue with optional image"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            report = serializer.save()
            TicketActionLog.objects.create(
                guest_report=report,
                action="Created",
                performed_by=None
            )
            send_guest_notification.delay(
                guest_email=report.guest_email,
                guest_report_id=report.id,
                tracking_code=report.tracking_code
            )
            return Response({
                "message": "Guest report created successfully",
                "tracking_code": str(report.tracking_code)
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='track/(?P<tracking_code>[^/.]+)')
    def track(self, request, tracking_code=None):
        """Guests track their issue using tracking_code"""
        try:
            report = GuestReport.objects.get(tracking_code=tracking_code)
            serializer = self.get_serializer(report)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except GuestReport.DoesNotExist:
            return Response(
                {"error": "Invalid tracking code"},
                status=status.HTTP_404_NOT_FOUND
            )


# -------------------- NotificationViewSet --------------------
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter notifications for the authenticated user."""
        return Notification.objects.filter(user=self.request.user)


# -------------------- StudentRegistrationViewSet --------------------
class StudentRegistrationViewSet(viewsets.ModelViewSet):
    queryset = StudentRegistration.objects.all()
    serializer_class = StudentRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Step 1: Student self-registration (creates inactive user + OTP)"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            registration = serializer.save()

            # Generate a 6-digit OTP
            otp = str(random.randint(100000, 999999))
            registration.otp_code = otp
            registration.expires_at = timezone.now() + timezone.timedelta(minutes=5)
            registration.save()

            # Send OTP email
            send_mail(
                "FixIT OTP Verification",
                f"Your OTP is {otp}. It expires in 5 minutes.",
                "fixit@university.edu",
                [registration.user.email],
                fail_silently=False,
            )

            return Response({"message": "OTP sent to email"}, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def verify(self, request):
        """Step 2: Verify OTP and activate account"""
        email = request.data.get("email")
        otp = request.data.get("otp")

        try:
            registration = StudentRegistration.objects.get(user__email=email)
        except StudentRegistration.DoesNotExist:
            return Response({"error": "Registration not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if OTP is still valid
        if not registration.is_valid():
            registration.status = "Expired"
            registration.save()
            return Response({"error": "OTP expired"}, status=status.HTTP_400_BAD_REQUEST)

        # Match OTP
        if registration.otp_code == otp:
            registration.status = "Verified"
            registration.save()
            return Response({"message": "Email verified. You can now log in."}, status=status.HTTP_200_OK)

        return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)


# -------------------- LocationViewSet --------------------
class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [permissions.AllowAny]


# -------------------- UserProfile API --------------------
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.get(user=request.user)
        return Response({
            "id": request.user.id,
            "username": request.user.username if hasattr(request.user, "username") else request.user.email,
            "email": request.user.email,
            "role": profile.role,
            "can_report": profile.can_report,
            "can_fix": profile.can_fix,
            "can_assign": profile.can_assign,
            "is_email_verified": profile.is_email_verified,
        })


# -------------------- Email Login --------------------
class EmailLoginView(TokenObtainPairView):
    """
    Custom login view that uses email instead of username.
    """
    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        print("🔥 EmailLoginView was called with:", request.data)
        return super().post(request, *args, **kwargs)
