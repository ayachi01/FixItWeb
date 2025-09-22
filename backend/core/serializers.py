from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from .models import (
    StudentRegistration, UserProfile, Invite, Ticket, GuestReport,
    Notification, Location, TicketImage, PasswordResetCode
)

User = get_user_model()  # ✅ Always reference your custom user


# -------------------- User + Profile --------------------
class UserSerializer(serializers.ModelSerializer):
    """Basic User serializer for returning user data"""
    class Meta:
        model = User
        fields = ['id', 'email']  # 👈 no "username" since you use email login


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['user', 'role', 'is_email_verified', 'email_domain']


# -------------------- Student Registration --------------------
class StudentRegistrationSerializer(serializers.ModelSerializer):
    """✅ Creates User + StudentRegistration record"""
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = StudentRegistration
        fields = ['email', 'password', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']

    def create(self, validated_data):
        """Create user as inactive + pending registration"""
        email = validated_data.pop("email")
        password = validated_data.pop("password")

        # ❌ Not active yet — must verify OTP first
        user = User.objects.create_user(
            email=email,
            password=password,
            is_active=False
        )

        # ✅ Create registration record
        registration = StudentRegistration.objects.create(user=user)
        return registration


# -------------------- Invites --------------------
class InviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = [
            'email', 'role', 'token', 'created_at', 'expires_at',
            'is_used', 'requires_admin_approval'
        ]


# -------------------- Tickets --------------------
class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = '__all__'

    def create(self, validated_data):
        request = self.context.get("request")
        ticket = Ticket.objects.create(**validated_data)

        # ✅ Handle image uploads linked to ticket
        if request and "image" in request.FILES:
            TicketImage.objects.create(
                ticket=ticket,
                image_url=request.FILES["image"],
                uploaded_by=request.user
            )
        return ticket


# -------------------- Guest Reports --------------------
class GuestReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestReport
        fields = '__all__'
        read_only_fields = ['id', 'tracking_code', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        # ✅ Attach uploaded image if present
        request = self.context.get("request")
        if request and "image" in request.FILES:
            validated_data["image"] = request.FILES["image"]
        report = GuestReport.objects.create(**validated_data)
        return report


# -------------------- Notifications --------------------
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'guest_email', 'message', 'is_read', 'created_at']


# -------------------- Locations --------------------
class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'building_name', 'floor_number', 'room_identifier']


# -------------------- JWT Auth (Email-based) --------------------
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """✅ Pure email+password JWT login (no username in request)"""

    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        print("🔥 EmailTokenObtainPairSerializer received:", attrs)

        if not email or not password:
            raise serializers.ValidationError("Email and password required")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password")

        user = authenticate(email=user.email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password")
        if not user.is_active:
            raise serializers.ValidationError("Account is inactive. Verify email first.")

        # ⚡ Call parent validate with correct credentials
        data = super().validate({"email": user.email, "password": password})
        data["email"] = user.email
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        if hasattr(user, "profile"):
            token["role"] = user.profile.role
        return token


# -------------------- Password Reset --------------------
class PasswordResetRequestSerializer(serializers.Serializer):
    """Request a reset code via email"""
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user with this email found.")
        self.context["user"] = user
        return value

    def create(self, validated_data):
        user = self.context["user"]
        reset_code = PasswordResetCode.objects.create(user=user)
        return reset_code


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirm reset code + set new password"""
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=6)

    def validate(self, attrs):
        email = attrs.get("email")
        code = attrs.get("code")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No user with this email."})

        try:
            reset_code = PasswordResetCode.objects.filter(
                user=user, code=code, is_used=False
            ).latest("created_at")
        except PasswordResetCode.DoesNotExist:
            raise serializers.ValidationError({"code": "Invalid or already used code."})

        if reset_code.is_expired():
            raise serializers.ValidationError({"code": "This code has expired."})

        attrs["user"] = user
        attrs["reset_code"] = reset_code
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        reset_code = self.validated_data["reset_code"]
        new_password = self.validated_data["new_password"]

        user.set_password(new_password)
        user.save()

        reset_code.mark_used()
        return user
