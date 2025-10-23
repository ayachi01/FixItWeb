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
    TicketAssignment, Permission,
)

#  Always reference your custom user dynamically
User = get_user_model()


# ==================================================
#              Student Profile Serializer
# ==================================================
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
        # Prevent overwriting student_id if already set
        if "student_id" in validated_data and instance.student_id:
            validated_data.pop("student_id")
        return super().update(instance, validated_data)


# ==================================================
#                  User Serializer
# ==================================================
class UserSerializer(serializers.ModelSerializer):
    """Basic User serializer for returning user data with full_name + status."""
    full_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "status"]

    def get_full_name(self, obj):
        if hasattr(obj, "get_full_name") and callable(obj.get_full_name):
            name = obj.get_full_name().strip()
            if name:
                return name
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.email or getattr(obj, "username", None)

    def get_status(self, obj):
        return "active" if obj.is_active else "inactive"


# ==================================================
#                  Role Serializer
# ==================================================
class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model (ensures JSON safe response)"""
    class Meta:
        model = Role
        fields = ["id", "name", "description"]


# ==================================================
#             Permission Serializer (nested)
# ==================================================
class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = [
            "can_report", "can_fix", "can_assign",
            "can_manage_users", "is_admin_level",
            "allowed_categories",
        ]


# ==================================================
#          Extended User Profile Serializer
# ==================================================
class UserProfileSerializer(serializers.ModelSerializer):
    """
    Extended profile serializer with role, flags, features, and nested student info.
    Matches what frontend UsersPage.tsx expects.
    """
    id = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    #  Role + Permissions
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source="role",
        write_only=True,
        required=False
    )
    permissions = PermissionSerializer(source="role.permissions", read_only=True)

    #  Nested StudentProfile
    student_profile = StudentProfileSerializer(required=False)

    #  Permission flags from properties
    can_fix = serializers.BooleanField(read_only=True)
    can_assign = serializers.BooleanField(read_only=True)
    can_manage_users = serializers.BooleanField(read_only=True)
    is_admin_level = serializers.BooleanField(read_only=True)

    features = serializers.SerializerMethodField()
    allowed_categories = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "id", "email", "first_name", "last_name", "full_name", "status",
            "role", "role_id", "is_email_verified", "email_domain",
            "permissions",
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
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return ""

    def get_status(self, obj):
        return "active" if getattr(obj.user, "is_active", False) else "inactive"

    # ---------- Features ----------
    def get_features(self, obj):
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
        return list(dict.fromkeys(features))

    def get_allowed_categories(self, obj):
        return obj.allowed_categories() if hasattr(obj, "allowed_categories") else []

    # ---------- Create ----------
    def create(self, validated_data):
        """
        Create User + UserProfile + optional StudentProfile.
        """
        student_data = validated_data.pop("student_profile", None)
        role = validated_data.pop("role", None)

        #  Extract user fields
        user_fields = {}
        for field in ["first_name", "last_name", "email", "password"]:
            if field in validated_data:
                user_fields[field] = validated_data.pop(field)

        #  Create User
        user = User.objects.create(
            first_name=user_fields.get("first_name", ""),
            last_name=user_fields.get("last_name", ""),
            email=user_fields["email"]
        )
        if "password" in user_fields and user_fields["password"]:
            user.set_password(user_fields["password"])
        user.save()

        #  Create UserProfile
        profile = UserProfile.objects.create(user=user, role=role, **validated_data)

        #  Create StudentProfile if data provided
        if student_data:
            StudentProfile.objects.create(user_profile=profile, **student_data)

        return profile

    # ---------- Update ----------
    def update(self, instance, validated_data):
        """
        Update UserProfile, related User fields, role, and nested StudentProfile.
        """
        student_data = validated_data.pop("student_profile", None)
        role = validated_data.pop("role", None)

        #  Update related User fields
        user = instance.user
        for field in ["first_name", "last_name", "email", "password"]:
            if field in validated_data:
                value = validated_data.pop(field)
                if field == "password" and value:
                    user.set_password(value)
                elif value is not None:
                    setattr(user, field, value)
        user.save()

        #  Update role
        if role:
            instance.role = role

        #  Update UserProfile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        #  Handle StudentProfile safely
        if student_data is not None:
            student_profile, _ = StudentProfile.objects.get_or_create(user_profile=instance)
            for attr, value in student_data.items():
                if attr == "student_id" and student_profile.student_id:
                    continue  #  don’t overwrite existing student_id
                setattr(student_profile, attr, value)
            student_profile.save()

        return instance


# ==================================================
#         Student Registration Serializer
# ==================================================
class StudentRegisterSerializer(serializers.ModelSerializer):
    """Serializer for student self-service registration"""
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "password", "confirm_password"]
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, attrs):
        # Check if passwords match
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        # Only allow emails from pirmaed.com
        email_domain = attrs["email"].split("@")[-1]
        if email_domain.lower() != "phinmaed.com":
            raise serializers.ValidationError(
                {"email": "Only phinmaed.com email addresses are allowed."}
            )

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


# ==================================================
#         Staff Create Serializer (Admin)
# ==================================================
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



# ==================================================
#                 Invite Serializers
# ==================================================
from rest_framework import serializers
from .models import Invite
from django.utils import timezone


class InviteSerializer(serializers.ModelSerializer):
    """
    Used by admin and frontend to view/create invites.
    Handles both model instances and dicts safely.
    """
    role_name = serializers.CharField(source='role.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    created_by_full_name = serializers.SerializerMethodField()  # For InvitesListPage
    expired = serializers.SerializerMethodField()  # Safe expired flag
    status_label = serializers.SerializerMethodField()  # Safe status label

    class Meta:
        model = Invite
        fields = [
            'id', 'email', 'token', 'role', 'role_name',
            'created_by', 'created_by_email', 'created_by_full_name',
            'created_at', 'expires_at', 'is_used', 'expired', 'status_label',
        ]
        read_only_fields = [
            'id', 'token', 'created_by', 'created_at', 'is_used', 'expired'
        ]

    # ------------------------
    # Serializer Methods
    # ------------------------
    def get_expired(self, obj):
        """
        Compute expired status safely.
        Works for both model instance and dict.
        """
        if isinstance(obj, Invite):
            return getattr(obj, 'is_expired', None) or (obj.expires_at and obj.expires_at < timezone.now())
        return obj.get('expired', False)

    def get_created_by_full_name(self, obj):
        """
        Return full name or email of the user who created the invite.
        Works for both model instance and dict.
        """
        if isinstance(obj, Invite):
            if obj.created_by:
                full_name = getattr(obj.created_by, "full_name", None)
                if not full_name:
                    full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
                return full_name or obj.created_by.email
            return None
        # obj is a dict (e.g., during POST creation)
        return obj.get('created_by_email', None)

    def get_status_label(self, obj):
        """
        Safely compute status label:
        - "Used" if invite is already used
        - "Expired" if invite expired
        - "Pending" otherwise
        Works for both model instance and dict.
        """
        if isinstance(obj, Invite):
            is_used = getattr(obj, 'is_used', False)
            expired = getattr(obj, 'is_expired', None)
            if expired is None and obj.expires_at:
                expired = obj.expires_at < timezone.now()
        else:
            is_used = obj.get('is_used', False)
            expired = obj.get('expired', False)

        if is_used:
            return "Used"
        if expired:
            return "Expired"
        return "Pending"

    # ------------------------
    # Email Validation
    # ------------------------
    def validate_email(self, value):
        """
        Prevent duplicate active invites but allow re-sending if expired or used.
        """
        existing_invite = Invite.objects.filter(email=value, is_used=False).first()
        if existing_invite:
            # Allow same email reuse handled by InviteViewSet.perform_create()
            pass
        return value


# ==================================================
#        Invite Registration Serializer
# ==================================================
class InviteAcceptSerializer(serializers.Serializer):
    """
    Used by the user to register via an invite.
    Matches InviteViewSet.register endpoint.
    """
    token = serializers.UUIDField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data


# ==================================================
#        Invite Validation Serializer
# ==================================================
class InviteValidateSerializer(serializers.Serializer):
    """
    Used to validate an invite token before registration.
    Matches InviteViewSet.validate endpoint.
    """
    token = serializers.UUIDField()

    def validate_token(self, value):
        try:
            invite = Invite.objects.get(token=value)
        except Invite.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired invite.")

        if not invite.can_be_used():
            raise serializers.ValidationError("Invite cannot be used (expired or already used).")

        return value



# ====================
# Ticket Image Serializer
# ====================
class TicketImageSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TicketImage
        fields = ["id", "image_url", "uploaded_by", "timestamp"]
        read_only_fields = ["id", "uploaded_by", "timestamp"]

    def get_image_url(self, obj):
        """
        Always return a full absolute URL for the image.
        Works on Flutter web, Android, and iOS.
        """
        request = self.context.get("request")
        if obj.image_url:
            try:
                if request is not None:
                    #  Example: http://192.168.5.137:8000/media/ticket_images/photo.jpg
                    return request.build_absolute_uri(obj.image_url.url)
                # fallback if no request context
                from django.conf import settings
                return f"{settings.MEDIA_URL}{obj.image_url.name}"
            except Exception:
                return None
        return None


# ====================
# Assignment Serializer
# ====================
class AssignmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TicketAssignment
        fields = ["id", "user", "assigned_at", "accepted", "accepted_at"]

# ====================
# Ticket Resolution Serializer
# ====================


class TicketResolutionSerializer(serializers.ModelSerializer):
    # Optional: include resolver's display name
    resolved_by_name = serializers.CharField(
        source="resolved_by.get_full_name", read_only=True
    )

    class Meta:
        model = TicketResolution
        fields = [
            "id",
            "ticket",
            "resolved_by",
            "resolved_by_name",
            "proof_image",
            "resolution_note",
            "timestamp",
        ]
        read_only_fields = ["id", "resolved_by", "resolved_by_name", "timestamp"]

    def create(self, validated_data):
        """Automatically set the resolved_by user from request context."""
        validated_data["resolved_by"] = self.context["request"].user
        return super().create(validated_data)

    def validate(self, attrs):
        """Custom validation to ensure proof and note logic align with model.clean()."""
        user = self.context["request"].user
        if not user or not hasattr(user, "profile"):
            raise serializers.ValidationError("User profile is required.")

        profile = user.profile
        if not profile.can_fix:
            raise serializers.ValidationError("You are not allowed to resolve tickets.")

        if getattr(profile, "requires_proof", False) and not attrs.get("proof_image"):
            raise serializers.ValidationError("Proof image is required for this user.")
        return attrs


# ====================
# Ticket Serializer
# ====================
class TicketSerializer(serializers.ModelSerializer):
    location_name = serializers.SerializerMethodField(read_only=True)
    reporter = UserSerializer(read_only=True)
    reporter_name = serializers.SerializerMethodField(read_only=True)
    assignments = AssignmentSerializer(many=True, read_only=True)
    assignees = serializers.SerializerMethodField(read_only=True)
    images = TicketImageSerializer(many=True, read_only=True)
    resolutions = TicketResolutionSerializer(many=True, read_only=True)

    # Custom fields for handling image uploads in create/update
    image = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        help_text="Upload one or multiple images for the ticket"
    )
    existing_images = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of existing image IDs to keep during update"
    )

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "status", "category", "urgency",
            "escalation_level", "reporter", "reporter_name",
            "assignments", "assignees", "location", "location_name",
            "created_at", "updated_at",
            "images", "resolutions", "image", "existing_images"
        ]
        read_only_fields = [
            "id", "reporter", "reporter_name", "assignments", "assignees",
            "created_at", "updated_at", "images", "resolutions"
        ]

    # ------------------------
    # Serializer Methods
    # ------------------------
    def get_location_name(self, obj):
        return str(obj.location) if obj.location else None

    def get_reporter_name(self, obj):
        if obj.reporter:
            if obj.reporter.first_name or obj.reporter.last_name:
                return f"{obj.reporter.first_name} {obj.reporter.last_name}".strip()
            return obj.reporter.email
        return None

    def get_assignees(self, obj):
        users = [assignment.user for assignment in obj.assignments.all()]
        return UserSerializer(users, many=True).data

    # ------------------------
    # Create
    # ------------------------
    def create(self, validated_data):
        images = validated_data.pop("image", [])
        if len(images) < 1:
            raise serializers.ValidationError({"image": "A ticket must have at least 1 image."})
        if len(images) > 3:
            raise serializers.ValidationError({"image": "Cannot upload more than 3 images."})

        ticket = super().create(validated_data)
        request = self.context.get("request")

        # Create TicketImage objects
        for img in images:
            TicketImage.objects.create(ticket=ticket, image_url=img, uploaded_by=request.user)

        return ticket

    # ------------------------
    # Update
    # ------------------------
    def update(self, instance, validated_data):
        request = self.context.get("request")
        new_images = validated_data.pop("image", [])
        existing_images_ids = validated_data.pop("existing_images", [])

        # Convert to integers and remove None
        existing_images_ids = [int(i) for i in existing_images_ids if i is not None]

        # Delete removed images
        for img in instance.images.all():
            if img.id not in existing_images_ids:
                img.delete()

        # Validate total images
        total_images = len(existing_images_ids) + len(new_images)
        if total_images < 1:
            raise serializers.ValidationError({"image": "A ticket must have at least 1 image."})
        if total_images > 3:
            raise serializers.ValidationError({"image": "Cannot have more than 3 images."})

        ticket = super().update(instance, validated_data)

        # Add new images
        for img in new_images:
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

        #  Add safe user info
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

        #  Store only safe fields inside JWT
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
