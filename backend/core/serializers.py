from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from .models import (
    UserProfile, Invite, Ticket, GuestReport,
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


# -------------------- Invites --------------------
class InviteSerializer(serializers.ModelSerializer):
    """Read serializer for returning invite details"""
    status = serializers.SerializerMethodField()
    approved_by = serializers.SerializerMethodField()

    class Meta:
        model = Invite
        fields = [
            'email', 'role', 'token',
            'created_at', 'expires_at',
            'is_used', 'requires_admin_approval',
            'is_approved', 'approved_by', 'approved_at',
            'status'
        ]

    def get_status(self, obj):
        if obj.is_used:
            return "used"
        if obj.expires_at < timezone.now():
            return "expired"
        if obj.requires_admin_approval and not obj.is_approved:
            return "pending_approval"
        if obj.is_approved:
            return "approved"
        return "active"

    def get_approved_by(self, obj):
        return obj.approved_by.email if obj.approved_by else None


class InviteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invites (input only)"""
    class Meta:
        model = Invite
        fields = ['email', 'role']


class InviteApproveSerializer(serializers.ModelSerializer):
    """Serializer used by admins to approve an invite"""
    class Meta:
        model = Invite
        fields = ['is_approved']

    def update(self, instance, validated_data):
        request = self.context.get("request")
        instance.is_approved = True
        instance.approved_at = timezone.now()
        if request and hasattr(request, "user"):
            instance.approved_by = request.user
        instance.save()
        return instance


class InviteAcceptSerializer(serializers.ModelSerializer):
    """Serializer for accepting an invite (user sets password)"""
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Invite
        fields = ["token", "password"]

    def validate(self, attrs):
        invite = self.instance
        if invite.is_used:
            raise serializers.ValidationError("Invite already used.")
        if invite.expires_at < timezone.now():
            raise serializers.ValidationError("Invite has expired.")
        if invite.requires_admin_approval and not invite.is_approved:
            raise serializers.ValidationError("This invite still requires admin approval.")
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.get("password")
        email = instance.email
        role = instance.role

        # ✅ Create user from invite
        user = User.objects.create_user(email=email, password=password, is_active=True)
        UserProfile.objects.create(user=user, role=role, is_email_verified=True)

        # ✅ Mark invite as used
        instance.is_used = True
        instance.save()
        return instance


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
        return GuestReport.objects.create(**validated_data)


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
        if hasattr(user, "profile"):
            data["role"] = user.profile.role
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
            raise serializers.ValidationError("No account found with this email.")
        self.context["user"] = user
        return value

    def create(self, validated_data):
        user = self.context["user"]
        return PasswordResetCode.objects.create(user=user)


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
            raise serializers.ValidationError({"email": "No account found with this email."})

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
