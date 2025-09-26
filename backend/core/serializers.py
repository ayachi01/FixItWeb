from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from .models import (
    UserProfile, Invite, Ticket,
    Location, TicketImage, PasswordResetCode,
    StudentProfile, TicketResolution,
    AuditLog
)

from .models import TicketAssignment


User = get_user_model()  # ✅ Always reference your custom user


# -------------------- User + Profile --------------------
class UserSerializer(serializers.ModelSerializer):
    """Basic User serializer for returning user data"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']  # include names


class StudentProfileSerializer(serializers.ModelSerializer):
    """Nested student profile serializer"""
    class Meta:
        model = StudentProfile
        fields = [
            'id', 'full_name', 'student_id',
            'course', 'year_level',
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    student_profile = StudentProfileSerializer(read_only=True)
    features = serializers.SerializerMethodField()
    allowed_categories = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'user', 'role', 'is_email_verified', 'email_domain',
            'features', 'allowed_categories', 'student_profile'
        ]

    def get_features(self, obj):
        """Build features dynamically from role flags"""
        features = []

        # ✅ Everyone can report
        if obj.can_report:
            features.extend(["canReport", "myReports"])

        # ✅ Fixer roles
        if obj.can_fix:
            features.extend([
                "assignedTickets",
                "uploadProof",
                "updateStatus",
                "workHistory",
            ])

        # ✅ Assignment capability
        if obj.can_assign:
            features.extend([
                "overview",
                "assignTickets",
                "reviewProof",
                "escalate",
            ])

        # ✅ User management
        if obj.can_manage_users:
            features.append("manageUsers")

        # ✅ Admin-level actions
        if obj.is_admin_level:
            features.extend([
                "reportsView",
                "escalate",
                "closeTickets",
            ])

        # ✅ Super / University admins
        if obj.role and obj.role.lower() in ["super admin", "university admin"]:
            features.extend([
                "systemSettings",
                "aiReports",
            ])

        # Remove duplicates while keeping order
        return list(dict.fromkeys(features))

    def get_allowed_categories(self, obj):
        return obj.allowed_categories()


# -------------------- Student Registration --------------------
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

        # ✅ Restrict to university emails only
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
            is_email_verified=False  # will be verified later
        )
        return user


# -------------------- Staff Registration (via invite/admin) --------------------
class StaffCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for registrar/HR creating staff/faculty accounts.
    Lets the creator specify which staff role (e.g., Faculty, Admin Staff, Janitorial Staff).
    """
    role = serializers.ChoiceField(choices=UserProfile.Role.choices)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "role"]

    def create(self, validated_data):
        role = validated_data.pop("role")

        # Create the user (no password yet — will be set when invite is accepted)
        user = User.objects.create_user(
            email=validated_data["email"],
            password=None,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=False,  # inactive until invite accepted
        )

        # Ensure a matching UserProfile exists and assign chosen role
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                "role": role,
                "is_email_verified": False
            }
        )
        if not created:
            profile.role = role
            profile.is_email_verified = False
            profile.save()

        # TODO: send invite email with password setup link
        return user



# -------------------- Invites --------------------
class InviteSerializer(serializers.ModelSerializer):
    """Read serializer for returning invite details"""
    status = serializers.SerializerMethodField()
    approved_by = serializers.SerializerMethodField()
    role = serializers.CharField(source="get_role_display", read_only=True)  # ✅ human-readable role

    class Meta:
        model = Invite
        fields = [
            "email", "role", "token",
            "created_at", "expires_at",
            "is_used", "requires_admin_approval",
            "is_approved", "approved_by", "approved_at",
            "status"
        ]
        read_only_fields = fields  # ✅ make all read-only for safety

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




from datetime import timedelta

class InviteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invites (input only)"""
    role = serializers.ChoiceField(choices=UserProfile.Role.choices)

    class Meta:
        model = Invite
        fields = ["email", "role"]

    def validate_email(self, value):
        """Ensure the email is unique for unused/active invites"""
        email = value.lower().strip()
        if Invite.objects.filter(email=email, is_used=False, expires_at__gt=timezone.now()).exists():
            raise serializers.ValidationError("An active invite has already been sent to this email.")
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def create(self, validated_data):
        """Create the invite with normalized email and expiry date"""
        validated_data["email"] = validated_data["email"].lower().strip()

        # ✅ Auto-set expiry (7 days from now if not provided by model defaults)
        if not validated_data.get("expires_at"):
            validated_data["expires_at"] = timezone.now() + timedelta(days=7)

        invite = Invite.objects.create(**validated_data)
        # TODO: send invite email with token link
        return invite




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

        # ✅ Create user if not exists, otherwise fetch
        user, created = User.objects.get_or_create(
            email=email,
            defaults={"is_active": True}
        )
        user.set_password(password)
        user.is_active = True
        user.save()

        # ✅ Fix: avoid duplicate profile
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={"role": role, "is_email_verified": True}
        )
        if not created:
            profile.role = role
            profile.is_email_verified = True
            profile.save()

        # ✅ Mark invite as used
        instance.is_used = True
        instance.save()

        return user


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

    # ✅ tell JWT to use email instead of username
    username_field = User.EMAIL_FIELD if hasattr(User, "EMAIL_FIELD") else "email"

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError("Email and password required")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password")

        # ✅ authenticate with email
        user = authenticate(
            request=self.context.get("request"),
            username=user.email,  # Django expects "username", even if USERNAME_FIELD=email
            password=password,
        )
        if not user:
            raise serializers.ValidationError("Invalid email or password")
        if not user.is_active:
            raise serializers.ValidationError("Account is inactive. Verify email first.")

        # ⚡ parent validate (use proper username_field)
        data = super().validate({
            self.username_field: getattr(user, self.username_field),
            "password": password,
        })

        # add extra fields to response
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
        # ✅ Use manager to ensure only 1 active reset code
        return PasswordResetCode.objects.create_for_user(user)


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


# -------------------- Ticket Images --------------------
class TicketImageSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = TicketImage
        fields = ['id', 'ticket', 'image_url', 'uploaded_by', 'uploaded_at']


# -------------------- Ticket Resolution --------------------
class TicketResolutionSerializer(serializers.ModelSerializer):
    resolved_by = UserSerializer(read_only=True)

    class Meta:
        model = TicketResolution
        fields = [
            "id",
            "ticket",
            "resolution_note",
            "proof_image",
            "resolved_by",
            "resolved_at",
        ]

    def validate(self, attrs):
        """
        Enforce proof image if the resolver's role requires it.
        """
        request = self.context.get("request")
        if request and hasattr(request.user, "profile"):
            profile = request.user.profile
            if getattr(profile, "requires_proof", False) and not attrs.get("proof_image"):
                raise serializers.ValidationError({
                    "proof_image": "This role requires uploading proof when resolving a ticket."
                })
        return attrs

    def create(self, validated_data):
        """
        Automatically set the resolver as the logged-in user.
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["resolved_by"] = request.user
        return super().create(validated_data)



# -------------------- Audit Log --------------------
class AuditLogSerializer(serializers.ModelSerializer):
    performed_by = UserSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'performed_by', 'timestamp', 'details']
