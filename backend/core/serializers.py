# ==================== Imports ====================
from datetime import timedelta
import re

from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.models import (
    UserProfile, StudentProfile, Role, Invite,
    Ticket, TicketImage, TicketResolution,
    Location, PasswordResetCode, AuditLog,
    TicketAssignment,
)

# ✅ Always reference your custom user
User = get_user_model()


# ==================== Serializers ====================
import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import StudentProfile, UserProfile, Role

User = get_user_model()

# ✅ Move this ABOVE UserProfileSerializer
class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for student academic details (writable for students)"""
    first_name = serializers.CharField(source="user_profile.user.first_name", read_only=True)
    last_name = serializers.CharField(source="user_profile.user.last_name", read_only=True)
    email = serializers.EmailField(source="user_profile.user.email", read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id", "student_id",
            "first_name", "last_name", "email",
            "course_code", "course_name",
            "year_level", "section",
            "college", "enrollment_year",
        ]
        read_only_fields = ["id", "first_name", "last_name", "email"]

    def validate_student_id(self, value):
        pattern = r"^\d{2}-\d{4}-\d{6}$"
        if not re.match(pattern, value):
            raise serializers.ValidationError(
                "Student ID must be in the format NN-NNNN-NNNNNN (e.g., 09-3456-348946)."
            )
        return value

    def update(self, instance, validated_data):
        if "student_id" in validated_data and instance.student_id:
            validated_data.pop("student_id")
        return super().update(instance, validated_data)



# -----------------------------
# User Serializer
# -----------------------------
class UserSerializer(serializers.ModelSerializer):
    """Basic User serializer for returning user data"""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name"]

    def get_full_name(self, obj):
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.email

class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model (ensures JSON safe response)"""
    class Meta:
        model = Role
        fields = ["id", "name", "description"]


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Extended profile serializer with role, flags, features, and nested student info.
    """
    id = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    # Permission flags (read-only, derived from UserProfile properties)
    can_fix = serializers.BooleanField(read_only=True)
    can_assign = serializers.BooleanField(read_only=True)
    can_manage_users = serializers.BooleanField(read_only=True)
    is_admin_level = serializers.BooleanField(read_only=True)

    features = serializers.SerializerMethodField()
    allowed_categories = serializers.SerializerMethodField()
    student_profile = StudentProfileSerializer(required=False)

    # ✅ Role is nested via RoleSerializer (not a raw model object)
    role = RoleSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "is_email_verified", "email_domain",
            "can_fix", "can_assign", "can_manage_users", "is_admin_level",
            "features", "allowed_categories", "student_profile",
        ]

    # ---------- Identity ----------
    def get_id(self, obj):
        return obj.user.id if hasattr(obj, "user") else None

    def get_email(self, obj):
        return obj.user.email if hasattr(obj, "user") else None

    def get_first_name(self, obj):
        return obj.user.first_name if hasattr(obj, "user") else None

    def get_last_name(self, obj):
        return obj.user.last_name if hasattr(obj, "user") else None

    def get_full_name(self, obj):
        if hasattr(obj, "user"):
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return ""

    # ---------- Features ----------
    def get_features(self, obj):
        """Build features dynamically from profile flags"""
        features = []
        if getattr(obj, "can_report", False):
            features.extend(["canReport", "myReports"])
        if getattr(obj, "can_fix", False):
            features.extend(["assignedTickets", "uploadProof", "updateStatus", "workHistory"])
        if getattr(obj, "can_assign", False):
            features.extend(["overview", "assignTickets", "reviewProof", "escalate"])
        if getattr(obj, "can_manage_users", False):
            features.append("manageUsers")
        if getattr(obj, "is_admin_level", False):
            features.extend(["reportsView", "escalate", "closeTickets"])
        if getattr(obj, "role", None) and obj.role.name.lower() in ["super admin", "university admin"]:
            features.extend(["systemSettings", "aiReports"])
        return list(dict.fromkeys(features))  # deduplicate

    def get_allowed_categories(self, obj):
        return obj.allowed_categories() if hasattr(obj, "allowed_categories") else []

    # ---------- Update ----------
    def update(self, instance, validated_data):
        """
        Update user profile and nested student profile.
        Only backend-managed fields are updated here (not frontend overwriting).
        """
        student_data = validated_data.pop("student_profile", None)

        # ✅ Update backend-controlled UserProfile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # ✅ Handle StudentProfile safely
        if student_data is not None:
            student_profile, _ = StudentProfile.objects.get_or_create(user_profile=instance)
            for attr, value in student_data.items():
                if attr == "student_id" and student_profile.student_id:
                    continue  # 🔒 don’t overwrite existing student_id
                setattr(student_profile, attr, value)
            student_profile.save()

        return instance


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
        student_role, _ = Role.objects.get_or_create(name="Student")
        UserProfile.objects.filter(user=user).update(
            role=student_role, is_email_verified=False
        )
        return user


class StaffCreateSerializer(serializers.ModelSerializer):
    """Registrar/HR creating staff/faculty accounts"""
    role = serializers.SlugRelatedField(queryset=Role.objects.all(), slug_field="name")

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
    role = serializers.CharField(source="role.name", read_only=True)

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
        if obj.is_expired:
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
    role = serializers.SlugRelatedField(queryset=Role.objects.all(), slug_field="name")

    class Meta:
        model = Invite
        fields = ["email", "role"]

    def validate_email(self, value):
        email = value.lower().strip()
        if Invite.objects.filter(
            email=email,
            is_used=False,
            expires_at__gt=timezone.now()
        ).exists():
            raise serializers.ValidationError("An active invite already exists for this email.")
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def create(self, validated_data):
        validated_data["email"] = validated_data["email"].lower().strip()
        return Invite.objects.create(**validated_data)  # expiry handled in Invite.save()


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
        if not invite.can_be_used():
            raise serializers.ValidationError(
                "This invite cannot be used (expired, already used, or not approved)."
            )
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

        instance.mark_used(user=user)  # model enforces rules
        return user


# ==================== Tickets ====================

# -----------------------------
# Ticket Image Serializer
# -----------------------------
class TicketImageSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = TicketImage
        fields = ["id", "image_url", "uploaded_by", "timestamp"]





    


# -----------------------------
# Assignment Serializer
# -----------------------------
class AssignmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TicketAssignment
        fields = ["id", "user", "assigned_at", "accepted", "accepted_at"]

# -----------------------------
# Ticket Image Serializer
# -----------------------------
class TicketImageSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = TicketImage
        fields = ["id", "image_url", "uploaded_by", "timestamp"]

# -----------------------------
# Ticket Resolution Serializer
# -----------------------------
class TicketResolutionSerializer(serializers.ModelSerializer):
    resolved_by = UserSerializer(read_only=True)

    class Meta:
        model = TicketResolution
        fields = ["id", "resolved_by", "proof_image", "resolution_note", "timestamp"]

# -----------------------------
# Ticket Serializer
# -----------------------------
class TicketSerializer(serializers.ModelSerializer):
    location_name = serializers.SerializerMethodField(read_only=True)
    reporter = UserSerializer(read_only=True)
    reporter_name = serializers.SerializerMethodField(read_only=True)  # Full name now
    assignments = AssignmentSerializer(many=True, read_only=True)
    images = TicketImageSerializer(many=True, read_only=True)
    resolutions = TicketResolutionSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "status", "category", "urgency",
            "escalation_level", "reporter", "reporter_name",
            "assignments", "location", "location_name",
            "created_at", "updated_at",
            "images", "resolutions"
        ]
        read_only_fields = [
            "id", "reporter", "reporter_name", "assignments",
            "created_at", "updated_at"
        ]

    def get_location_name(self, obj):
        return str(obj.location) if obj.location else None

    def get_reporter_name(self, obj):
        if obj.reporter:
            if obj.reporter.first_name or obj.reporter.last_name:
                return f"{obj.reporter.first_name} {obj.reporter.last_name}".strip()
            return obj.reporter.email
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["reporter"] = request.user

        images = request.FILES.getlist("image") if request else []
        if len(images) < 1:
            raise serializers.ValidationError({"image": "At least one image is required."})
        if len(images) > 3:
            raise serializers.ValidationError({"image": "A maximum of 3 images are allowed."})

        ticket = Ticket.objects.create(**validated_data)

        for img in images:
            TicketImage.objects.create(ticket=ticket, image_url=img, uploaded_by=request.user)

        return ticket



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

        # Call parent validation
        data = super().validate({
            self.username_field: getattr(user, self.username_field),
            "password": password,
        })

        # ✅ Add safe user info
        data["email"] = user.email
        if hasattr(user, "profile") and user.profile:
            data["role"] = (
                user.profile.role.name if user.profile.role else None
            )  # always string or None
            data["is_email_verified"] = user.profile.is_email_verified
        else:
            data["role"] = None
            data["is_email_verified"] = False

        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email

        # ✅ Store only safe fields inside JWT
        if hasattr(user, "profile") and user.profile:
            token["role"] = (
                user.profile.role.name if user.profile.role else None
            )  # always string or None
            token["is_email_verified"] = user.profile.is_email_verified
        else:
            token["role"] = None
            token["is_email_verified"] = False

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
