from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from .models import (
    StudentRegistration, UserProfile, Invite, Ticket, GuestReport,
    Notification, Location, TicketImage
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
        """Create user + active profile + pending registration"""
        email = validated_data.pop("email")
        password = validated_data.pop("password")

        # ✅ Create ACTIVE user (so login works right away)
        user = User.objects.create_user(
            email=email,
            password=password,
            is_active=True  # 🚀 allow login immediately
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

    def validate(self, data):
        # ✅ Handle image uploads linked to ticket
        if 'image' in self.context['request'].FILES:
            TicketImage.objects.create(
                ticket=data.get('ticket'),
                image_url=self.context['request'].FILES['image'],
                uploaded_by=self.context['request'].user
            )
        return data


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
