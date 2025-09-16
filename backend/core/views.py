from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from jose import jwt, JWTError
from pyotp import random_base32, TOTP
from django.contrib.auth.models import User
from .models import UserProfile, Invite, Location, Ticket, GuestReport, TicketImage, TicketActionLog, Notification, AuditLog
from .serializers import UserProfileSerializer, InviteSerializer, TicketSerializer, GuestReportSerializer, NotificationSerializer
# from .tasks import send_notification, check_escalation
from django.conf import settings
import uuid

JWT_SECRET = 'your-secret-key'  # Replace with secure key in settings.py

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
        valid_domains = ['student.university.edu', 'faculty.university.edu', 'admin.university.edu']
        if domain not in valid_domains:
            return Response({'error': 'Invalid university email domain'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user and profile
        user = User.objects.create_user(username=email, email=email, password=password)
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
            
            user = User.objects.create_user(username=invite.email, email=invite.email, password=password)
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
            check_escalation.delay(ticket.id, is_ticket=True)
            send_notification.delay(
                user_id=request.user.id,
                ticket_id=ticket.id,
                message=f'Ticket #{ticket.id} Created'
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GuestReportViewSet(viewsets.ModelViewSet):
    queryset = GuestReport.objects.all()
    serializer_class = GuestReportSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def report_issue(self, request):
        """Create a guest report with photo proof and tracking code."""
        serializer = GuestReportSerializer(data=request.data)
        if serializer.is_valid():
            guest_report = serializer.save()
            TicketActionLog.objects.create(guest_report=guest_report, action='Created', performed_by=None)
            check_escalation.delay(guest_report.id, is_ticket=False)
            send_notification.delay(
                guest_email=guest_report.guest_email,
                guest_report_id=guest_report.id,
                message=f'Guest Report #{guest_report.id} Created. Track it with code: {guest_report.tracking_code}'
            )
            return Response({
                'message': 'Guest report created',
                'tracking_code': str(guest_report.tracking_code)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='track/(?P<tracking_code>[^/.]+)')
    def track(self, request, tracking_code=None):
        """Track guest report status by tracking code."""
        try:
            guest_report = GuestReport.objects.get(tracking_code=tracking_code)
            serializer = GuestReportSerializer(guest_report)
            return Response(serializer.data)
        except GuestReport.DoesNotExist:
            return Response({'error': 'Invalid tracking code'}, status=status.HTTP_404_NOT_FOUND)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter notifications for the authenticated user."""
        return Notification.objects.filter(user=self.request.user)