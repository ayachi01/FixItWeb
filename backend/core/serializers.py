# ==================== Imports ====================
from datetime import timedelta

from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    UserProfile, StudentProfile,
    Invite, Ticket, TicketImage, TicketResolution,
    Location, PasswordResetCode,
    AuditLog, TicketAssignment,
)


# ✅ Always reference your custom user
User = get_user_model()


# ==================== User & Profile ====================
class UserSerializer(serializers.ModelSerializer):
    """Basic User serializer for returning user data"""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name"]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class StudentProfileSerializer(serializers.ModelSerializer):
    """Nested student profile serializer"""
    class Meta:
        model = StudentProfile
        fields = ["id", "full_name", "student_id", "course", "year_level"]


class UserProfileSerializer(serializers.ModelSerializer):
    # Flattened user info
    id = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    # ✅ Expose role-based flags directly
    can_fix = serializers.BooleanField(read_only=True)
    can_assign = serializers.BooleanField(read_only=True)
    can_manage_users = serializers.BooleanField(read_only=True)
    is_admin_level = serializers.BooleanField(read_only=True)

    features = serializers.SerializerMethodField()
    allowed_categories = serializers.SerializerMethodField()
    student_profile = StudentProfileSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "is_email_verified", "email_domain",
            "can_fix", "can_assign", "can_manage_users", "is_admin_level",  # 👈 now exposed
            "features", "allowed_categories", "student_profile",
        ]

    def get_id(self, obj):
        if isinstance(obj, User):
            return obj.id
        return getattr(obj.user, "id", None)

    def get_email(self, obj):
        if isinstance(obj, User):
            return obj.email
        return getattr(obj.user, "email", None)

    def get_first_name(self, obj):
        if isinstance(obj, User):
            return obj.first_name
        return getattr(obj.user, "first_name", None)

    def get_last_name(self, obj):
        if isinstance(obj, User):
            return obj.last_name
        return getattr(obj.user, "last_name", None)

    def get_full_name(self, obj):
        if isinstance(obj, User):
            return f"{obj.first_name} {obj.last_name}".strip()
        if getattr(obj, "user", None):
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        if getattr(obj, "student_profile", None):
            return obj.student_profile.full_name
        return ""

    def get_features(self, obj):
        """Build features dynamically from profile flags"""
        features = []

        if getattr(obj, "can_report", False):
            features.extend(["canReport", "myReports"])
        if getattr(obj, "can_fix", False):
            features.extend([
                "assignedTickets", "uploadProof",
                "updateStatus", "workHistory",
            ])
        if getattr(obj, "can_assign", False):
            features.extend([
                "overview", "assignTickets",
                "reviewProof", "escalate",
            ])
        if getattr(obj, "can_manage_users", False):
            features.append("manageUsers")
        if getattr(obj, "is_admin_level", False):
            features.extend([
                "reportsView", "escalate", "closeTickets",
            ])
        if getattr(obj, "role", "").lower() in ["super admin", "university admin"]:
            features.extend(["systemSettings", "aiReports"])

        return list(dict.fromkeys(features))

    def get_allowed_categories(self, obj):
        return obj.allowed_categories() if hasattr(obj, "allowed_categories") else []

# ==================== Registration ====================
class StudentRegisterSerializer(serializers.ModelSerializer):
    """Serializer for student self-service registration"""
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "password", "confirm_password"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        if not attrs["email"].endswith(".edu") and "university" not in attrs["email"]:
            raise serializers.ValidationError({"email": "Must use a valid university email."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )
        UserProfile.objects.filter(user=user).update(
            role=UserProfile.Role.STUDENT,
            is_email_verified=False,
        )
        return user


class StaffCreateSerializer(serializers.ModelSerializer):
    """Registrar/HR creating staff/faculty accounts"""
    role = serializers.ChoiceField(choices=UserProfile.Role.choices)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "role"]

    def create(self, validated_data):
        role = validated_data.pop("role")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=None,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=False,
        )
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={"role": role, "is_email_verified": False},
        )
        if not created:
            profile.role = role
            profile.is_email_verified = False
            profile.save()
        return user


# ==================== Invites ====================
class InviteSerializer(serializers.ModelSerializer):
    """Read serializer for returning invite details"""
    status = serializers.SerializerMethodField()
    approved_by = serializers.SerializerMethodField()
    role = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = Invite
        fields = [
            "email", "role", "token",
            "created_at", "expires_at",
            "is_used", "requires_admin_approval",
            "is_approved", "approved_by", "approved_at",
            "status",
        ]
        read_only_fields = fields

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
    """Serializer for creating invites"""
    role = serializers.ChoiceField(choices=UserProfile.Role.choices)

    class Meta:
        model = Invite
        fields = ["email", "role"]

    def validate_email(self, value):
        email = value.lower().strip()
        if Invite.objects.filter(email=email, is_used=False, expires_at__gt=timezone.now()).exists():
            raise serializers.ValidationError("An active invite already exists for this email.")
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def create(self, validated_data):
        validated_data["email"] = validated_data["email"].lower().strip()
        if not validated_data.get("expires_at"):
            validated_data["expires_at"] = timezone.now() + timedelta(days=7)
        return Invite.objects.create(**validated_data)


class InviteApproveSerializer(serializers.ModelSerializer):
    """Admins approve an invite"""
    class Meta:
        model = Invite
        fields = ["is_approved"]

    def update(self, instance, validated_data):
        request = self.context.get("request")
        instance.is_approved = True
        instance.approved_at = timezone.now()
        if request and hasattr(request, "user"):
            instance.approved_by = request.user
        instance.save()
        return instance


class InviteAcceptSerializer(serializers.ModelSerializer):
    """Invite acceptance (set password)"""
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
            raise serializers.ValidationError("This invite requires admin approval.")
        return attrs

    def update(self, instance, validated_data):
        password = validated_data["password"]
        user, _ = User.objects.get_or_create(
            email=instance.email,
            defaults={"is_active": True},
        )
        user.set_password(password)
        user.is_active = True
        user.save()

        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={"role": instance.role, "is_email_verified": True},
        )
        if not created:
            profile.role = instance.role
            profile.is_email_verified = True
            profile.save()

        instance.is_used = True
        instance.save()
        return user



# ==================== Tickets ====================
class TicketSerializer(serializers.ModelSerializer):
    location_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Ticket
        fields = "__all__"

    def get_location_name(self, obj):
        # Use __str__() of Location to return a readable string
        return str(obj.location) if obj.location else None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["reporter"] = request.user
        ticket = Ticket.objects.create(**validated_data)
        if request and "image" in request.FILES:
            TicketImage.objects.create(
                ticket=ticket,
                image_url=request.FILES["image"],
                uploaded_by=request.user,
            )
        return ticket


class TicketImageSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = TicketImage
        fields = ["id", "ticket", "image_url", "uploaded_by", "timestamp"]


class TicketResolutionSerializer(serializers.ModelSerializer):
    resolved_by = UserSerializer(read_only=True)

    class Meta:
        model = TicketResolution
        fields = [
            "id", "ticket", "resolution_note",
            "proof_image", "resolved_by", "timestamp",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if request and hasattr(request.user, "profile"):
            profile = request.user.profile
            if getattr(profile, "requires_proof", False) and not attrs.get("proof_image"):
                raise serializers.ValidationError({
                    "proof_image": "This role requires proof when resolving a ticket."
                })
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["resolved_by"] = request.user
        return super().create(validated_data)


# ==================== Locations ====================
class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "building_name", "floor_number", "room_identifier"]


# ==================== JWT Auth (Email-based) ====================
class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Email+password JWT login"""
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)

    username_field = User.EMAIL_FIELD if hasattr(User, "EMAIL_FIELD") else "email"

    def validate(self, attrs):
        email, password = attrs.get("email"), attrs.get("password")
        if not email or not password:
            raise serializers.ValidationError("Email and password required")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password")

        user = authenticate(
            request=self.context.get("request"),
            username=user.email,
            password=password,
        )
        if not user:
            raise serializers.ValidationError("Invalid email or password")
        if not user.is_active:
            raise serializers.ValidationError("Account is inactive. Verify email first.")

        data = super().validate({
            self.username_field: getattr(user, self.username_field),
            "password": password,
        })
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


# ==================== Password Reset ====================
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
        return PasswordResetCode.objects.create_for_user(self.context["user"])


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirm reset code + set new password"""
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=6)

    def validate(self, attrs):
        email, code = attrs["email"], attrs["code"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No account found."})

        try:
            reset_code = PasswordResetCode.objects.filter(
                user=user, code=code, is_used=False
            ).latest("created_at")
        except PasswordResetCode.DoesNotExist:
            raise serializers.ValidationError({"code": "Invalid or used code."})

        if reset_code.is_expired():
            raise serializers.ValidationError({"code": "This code has expired."})

        attrs["user"], attrs["reset_code"] = user, reset_code
        return attrs

    def save(self, **kwargs):
        user, reset_code, new_password = (
            self.validated_data["user"],
            self.validated_data["reset_code"],
            self.validated_data["new_password"],
        )
        user.set_password(new_password)
        user.save()
        reset_code.mark_used()
        return user


# ==================== Audit Logs ====================
class AuditLogSerializer(serializers.ModelSerializer):
    performed_by = UserSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "action", "performed_by", "timestamp", "details"]
