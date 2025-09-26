# backend/core/models.py
import logging
import random
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.models import AbstractUser, BaseUserManager, PermissionsMixin
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed

# Validators
from core.validators import validate_file_size, validate_image_extension


logger = logging.getLogger(__name__)



# ======================
# 1. USER & AUTHENTICATION
# ======================

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)

        extra_fields.setdefault("username", email.split("@")[0])

        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser, PermissionsMixin):
    email = models.EmailField(unique=True, db_index=True)

    # Remove username requirement
    username = models.CharField(max_length=150, blank=True, null=True)

    otp_hash = models.CharField(max_length=128, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    def set_otp(self, raw_otp: str):
        self.otp_hash = make_password(raw_otp)
        self.otp_created_at = timezone.now()
        self.save(update_fields=["otp_hash", "otp_created_at"])

    def check_otp(self, raw_otp: str) -> bool:
        if not self.otp_hash or not self.otp_created_at:
            return False
        if self.otp_created_at + timedelta(minutes=15) < timezone.now():
            return False
        return check_password(raw_otp, self.otp_hash)

    def clear_otp(self):
        self.otp_hash = None
        self.otp_created_at = None
        self.save(update_fields=["otp_hash", "otp_created_at"])


# ======================
# 1b. UserProfile & RBAC
# ======================

class UserProfile(models.Model):
    class Role(models.TextChoices):
        STUDENT = "Student", "Student"
        FACULTY = "Faculty", "Faculty"
        ADMIN_STAFF = "Admin Staff", "Admin Staff"
        VISITOR = "Visitor", "Visitor"
        JANITORIAL = "Janitorial Staff", "Janitorial Staff"
        UTILITY = "Utility Worker", "Utility Worker"
        IT_SUPPORT = "IT Support", "IT Support"
        SECURITY_GUARD = "Security Guard", "Security Guard"
        MAINTENANCE_OFFICER = "Maintenance Officer", "Maintenance Officer"
        REGISTRAR = "Registrar", "Registrar"
        HR = "HR", "HR"
        UNIVERSITY_ADMIN = "University Admin", "University Admin"

    # 🔒 Centralized role–permission matrix
    ROLE_PERMISSION_MAP = {
        Role.STUDENT:          {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": False, "is_admin_level": False},
        Role.FACULTY:          {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": False, "is_admin_level": False},
        Role.ADMIN_STAFF:      {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": False, "is_admin_level": False},
        Role.VISITOR:          {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": False, "is_admin_level": False},
        Role.JANITORIAL:       {"can_report": True,  "can_fix": True,  "can_assign": False, "can_manage_users": False, "is_admin_level": False},
        Role.UTILITY:          {"can_report": True,  "can_fix": True,  "can_assign": False, "can_manage_users": False, "is_admin_level": False},
        Role.IT_SUPPORT:       {"can_report": True,  "can_fix": True,  "can_assign": False, "can_manage_users": False, "is_admin_level": False},
        Role.SECURITY_GUARD:   {"can_report": True,  "can_fix": True,  "can_assign": False, "can_manage_users": False, "is_admin_level": False},
        Role.MAINTENANCE_OFFICER: {"can_report": True, "can_fix": False, "can_assign": True, "can_manage_users": False, "is_admin_level": False},
        Role.REGISTRAR:        {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": True,  "is_admin_level": True},
        Role.HR:               {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": True,  "is_admin_level": True},
        Role.UNIVERSITY_ADMIN: {"can_report": True,  "can_fix": False, "can_assign": True,  "can_manage_users": True,  "is_admin_level": True},
    }

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=50, choices=Role.choices, blank=True, db_index=True)
    is_email_verified = models.BooleanField(default=False)
    email_domain = models.CharField(max_length=100, blank=True)
    created_by_admin = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["role"])]

    def save(self, *args, **kwargs):
        # Track role changes for signals
        if self.pk:
            old = UserProfile.objects.filter(pk=self.pk).values("role").first()
            if old and old["role"] != self.role:
                setattr(self, "_role_changed", True)

        # Auto-assign email domain & default role
        if getattr(self.user, "email", None):
            self.email_domain = self.user.email.split("@")[-1].lower()
        if not self.role:
            if self.email_domain == "student.university.edu":
                self.role = self.Role.STUDENT
            elif self.email_domain == "faculty.university.edu":
                self.role = self.Role.FACULTY
            elif self.email_domain == "admin.university.edu":
                self.role = self.Role.ADMIN_STAFF
            else:
                self.role = self.Role.VISITOR

        super().save(*args, **kwargs)

    # === Permissions (powered by the matrix) ===
    @property
    def can_report(self):
        return self.ROLE_PERMISSION_MAP.get(self.role, {}).get("can_report", False)

    @property
    def can_fix(self):
        return self.ROLE_PERMISSION_MAP.get(self.role, {}).get("can_fix", False)

    @property
    def requires_proof(self):
        return self.can_fix

    @property
    def can_assign(self):
        return self.ROLE_PERMISSION_MAP.get(self.role, {}).get("can_assign", False)

    @property
    def can_manage_users(self):
        return self.ROLE_PERMISSION_MAP.get(self.role, {}).get("can_manage_users", False)

    @property
    def is_admin_level(self):
        return self.ROLE_PERMISSION_MAP.get(self.role, {}).get("is_admin_level", False)

    @property
    def can_close_tickets(self):
        return self.is_admin_level

    # 🔒 Allowed ticket categories per role
    CATEGORY_MAP = {
        Role.JANITORIAL: ["Cleaning"],
        Role.UTILITY: ["Plumbing", "Electrical", "Structural", "HVAC"],
        Role.IT_SUPPORT: ["Technology", "Equipment"],
        Role.SECURITY_GUARD: ["Disturbance", "Security", "Parking"],
    }

    def allowed_categories(self):
        return self.CATEGORY_MAP.get(self.role, [])

    def __str__(self):
        return f"{self.user.email} - {self.role or 'No Role'}"


# ======================
# StudentProfile, PasswordResetCode
# ======================

class StudentProfile(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name="student_profile")
    full_name = models.CharField(max_length=255, blank=True)
    course = models.CharField(max_length=255, blank=True, null=True)
    year_level = models.PositiveIntegerField(blank=True, null=True)
    student_id = models.CharField(max_length=50, blank=True, null=True, unique=True)

    def __str__(self):
        return f"StudentProfile: {self.full_name or self.user_profile.user.email}"


class PasswordResetCodeManager(models.Manager):
    def create_for_user(self, user):
        """
        Create a new reset code for the user.
        Ensures only one active code exists per user.
        """
        with transaction.atomic():
            # Mark all old active codes as used
            self.filter(user=user, is_used=False).update(is_used=True)

            # Generate new code
            code = f"{random.randint(100000, 999999)}"
            return self.create(user=user, code=code)


class PasswordResetCode(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_codes"
    )
    code = models.CharField(max_length=6, blank=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    is_used = models.BooleanField(default=False, db_index=True)

    objects = PasswordResetCodeManager()

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "is_used"],
                condition=models.Q(is_used=False),
                name="unique_active_reset_code_per_user"
            )
        ]

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"{random.randint(100000, 999999)}"
        super().save(*args, **kwargs)

    def is_expired(self):
        return self.created_at + timedelta(minutes=15) < timezone.now()

    def mark_used(self):
        self.is_used = True
        self.save(update_fields=["is_used"])

    def __str__(self):
        status = "used" if self.is_used else "active"
        return f"PasswordResetCode for {self.user.email} - {self.code} ({status})"

# ======================
# 2. INVITE & REGISTRATION
# ======================

class Invite(models.Model):
    email = models.EmailField(db_index=True)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    role = models.CharField(max_length=50, choices=UserProfile.Role.choices)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="invites_created",
    )
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_used = models.BooleanField(default=False)

    requires_admin_approval = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_invites",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["email", "is_used"], name="unique_active_invite_per_email"
            )
        ]

    def save(self, *args, **kwargs):
        """Auto-set expiry and admin approval flags when saving."""
        expiry_hours = getattr(settings, "INVITE_EXPIRY_HOURS", 24)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=expiry_hours)

        if self.role in [
            UserProfile.Role.SECURITY_GUARD,
            UserProfile.Role.MAINTENANCE_OFFICER,
        ]:
            self.requires_admin_approval = True

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invite for {self.email} - {self.role}"

    # =====================================================
    # ⏳ Expiration Enforcement
    # =====================================================
    @property
    def is_expired(self) -> bool:
        """Return True if invite has expired."""
        return self.expires_at and timezone.now() > self.expires_at

    def can_be_used(self) -> bool:
        """
        Check if the invite can be used.
        - Not expired
        - Not already used
        - Approved if approval required
        """
        if self.is_used:
            return False
        if self.is_expired:
            return False
        if self.requires_admin_approval and not self.is_approved:
            return False
        return True

    def mark_used(self, user=None):
        """Mark the invite as used and optionally log who used it."""
        if not self.can_be_used():
            raise ValidationError("Invite cannot be used (expired, already used, or not approved).")

        self.is_used = True
        self.save(update_fields=["is_used"])
        return True


# ======================
# 3. LOCATIONS
# ======================

class Location(models.Model):
    id = models.AutoField(primary_key=True)
    building_name = models.CharField(max_length=100)
    floor_number = models.CharField(max_length=50)
    room_identifier = models.CharField(max_length=100)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("building_name", "floor_number", "room_identifier"),
                name="unique_location"
            )
        ]

    def __str__(self):
        return f"{self.building_name} - Floor {self.floor_number} - {self.room_identifier}"


# ======================
# 4. TICKETING
# ======================




class Ticket(models.Model):
    class Status(models.TextChoices):
        CREATED = "Created", "Created"
        ASSIGNED = "Assigned", "Assigned"
        IN_PROGRESS = "In Progress", "In Progress"
        NEEDS_ASSISTANCE = "Needs Assistance", "Needs Assistance"
        RESOLVED = "Resolved", "Resolved"
        CLOSED = "Closed", "Closed"
        REOPENED = "Reopened", "Reopened"

    class Category(models.TextChoices):
        CLEANING = "Cleaning", "Cleaning"
        PLUMBING = "Plumbing", "Plumbing"
        ELECTRICAL = "Electrical", "Electrical"
        STRUCTURAL = "Structural", "Structural"
        HVAC = "HVAC", "HVAC"
        TECHNOLOGY = "Technology", "Technology"
        EQUIPMENT = "Equipment", "Equipment"
        DISTURBANCE = "Disturbance", "Disturbance"
        SECURITY = "Security", "Security"
        PARKING = "Parking", "Parking"

    class Escalation(models.TextChoices):
        NONE = "None", "None"
        SECONDARY = "Secondary", "Secondary"
        ADMIN = "Admin", "Admin"

    class Urgency(models.TextChoices):
        STANDARD = "Standard", "Standard"
        URGENT = "Urgent", "Urgent"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reported_tickets"
    )
    location = models.ForeignKey(
        "Location",
        on_delete=models.CASCADE,
        related_name="tickets"
    )
    description = models.TextField()
    category = models.CharField(max_length=50, choices=Category.choices, db_index=True)
    urgency = models.CharField(
        max_length=50,
        choices=Urgency.choices,
        default=Urgency.STANDARD,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED,
        db_index=True,
    )
    escalation_level = models.CharField(
        max_length=20,
        choices=Escalation.choices,
        default=Escalation.NONE,
        db_index=True,
    )

    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="TicketAssignment",
        related_name="assigned_tickets",
    )

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["category"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["urgency"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(description=""),
                name="ticket_description_not_empty"
            )
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_status = getattr(self, "status", None)
        self._original_escalation_level = getattr(self, "escalation_level", None)

    # 🔒 Validation rules
    def clean(self):
        errors = {}
        if not self.description or not self.description.strip():
            errors["description"] = "Description cannot be empty."
        if not self.location:
            errors["location"] = "Ticket must be linked to a location."
        if not self.category:
            errors["category"] = "Category is required."

        if self.status in {self.Status.RESOLVED, self.Status.CLOSED} and not self.assignees.exists():
            errors["status"] = f"Ticket cannot be marked {self.status} without an assignee."

        if errors:
            raise ValidationError(errors)

    def has_changed(self, field):
        """Check if a field’s value has changed since loading from DB"""
        if field == "status":
            return getattr(self, "status") != self._original_status
        if field == "escalation_level":
            return getattr(self, "escalation_level") != self._original_escalation_level
        if not self.pk:
            return False
        old = Ticket.objects.filter(pk=self.pk).values(field).first()
        return old and getattr(self, field) != old[field]

    # 🚨 Auto-escalation with audit log
    def auto_escalate(self, performed_by=None):
        now = timezone.now()
        age = now - self.created_at

        if self.status in {self.Status.RESOLVED, self.Status.CLOSED}:
            return False

        changed = False
        new_level = self.escalation_level

        if self.escalation_level == self.Escalation.NONE:
            if self.urgency == self.Urgency.URGENT and age > timedelta(hours=4):
                new_level = self.Escalation.SECONDARY
                changed = True
            elif self.urgency == self.Urgency.STANDARD and age > timedelta(hours=24):
                new_level = self.Escalation.SECONDARY
                changed = True

        if age > timedelta(hours=48) and self.escalation_level != self.Escalation.ADMIN:
            new_level = self.Escalation.ADMIN
            changed = True

        if changed and new_level != self.escalation_level:
            with transaction.atomic():
                self.escalation_level = new_level
                self.save(update_fields=["escalation_level", "updated_at"])
                create_audit(
                    action=AuditLog.Action.TICKET_ESCALATED,
                    performed_by=performed_by,
                    target_user=self.reporter,
                    details=f"Ticket #{self.id} escalated to {self.escalation_level}",
                )
            return True
        return False

    # ✅ Close ticket with audit
    def close(self, performed_by=None):
        if self.status != self.Status.CLOSED:
            with transaction.atomic():
                self.status = self.Status.CLOSED
                self.save(update_fields=["status", "updated_at"])
                create_audit(
                    action=AuditLog.Action.TICKET_CLOSED,
                    performed_by=performed_by,
                    target_user=self.reporter,
                    details=f"Ticket #{self.id} closed.",
                )
        return self

    # 🔄 Reopen ticket with audit
    def reopen(self, performed_by=None):
        if self.status == self.Status.CLOSED:
            with transaction.atomic():
                self.status = self.Status.REOPENED
                self.save(update_fields=["status", "updated_at"])
                create_audit(
                    action=AuditLog.Action.TICKET_REOPENED,
                    performed_by=performed_by,
                    target_user=self.reporter,
                    details=f"Ticket #{self.id} reopened.",
                )
        return self

    def __str__(self):
        return f"Ticket #{self.id} - {self.status} - Escalation: {self.escalation_level}"


class TicketAssignment(models.Model):
    ticket = models.ForeignKey(
        "Ticket",
        on_delete=models.CASCADE,
        related_name="assignments"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ticket_assignments"
    )
    assigned_at = models.DateTimeField(default=timezone.now)
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["ticket", "user"], name="unique_ticket_assignment")
        ]

    # 🔒 Validation rules
    def clean(self):
        errors = {}
        profile = getattr(self.user, "profile", None)

        if not profile:
            errors["user"] = "Assigned user must have a profile."
        elif not profile.can_fix:
            errors["user"] = f"{self.user} cannot be assigned tickets."
        elif self.ticket and self.ticket.category not in profile.allowed_categories():
            errors["ticket"] = f"{profile.role} cannot be assigned to {self.ticket.category} tickets."

        if errors:
            raise ValidationError(errors)

    # ✅ Save with validation only (audit handled externally)
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    # 🚀 Mark as accepted safely (audit handled externally)
    def mark_accepted(self):
        with transaction.atomic():
            self.accepted = True
            self.accepted_at = timezone.now()
            self.save(update_fields=["accepted", "accepted_at"])
        return self

    def __str__(self):
        return f"Assignment: {self.user} -> Ticket #{self.ticket.id}"


class TicketImage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="images")
    image_url = models.ImageField(upload_to="ticket_images/")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(default=timezone.now)

    def clean(self):
        if not self.ticket:
            raise ValidationError("TicketImage must be linked to a Ticket.")

    def __str__(self):
        return f"Image for Ticket #{self.ticket.id} uploaded by {self.uploaded_by}"





class TicketResolution(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="resolutions"
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    proof_image = models.ImageField(
        upload_to="resolutions/",
        null=True,
        blank=True,
        validators=[validate_file_size, validate_image_extension],
    )
    resolution_note = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=~models.Q(resolution_note=""),
                name="resolution_note_not_empty"
            )
        ]

    # 🔒 Validation rules
    def clean(self):
        errors = {}

        if not self.resolved_by:
            errors["resolved_by"] = "A resolver must be set."
        else:
            profile = getattr(self.resolved_by, "profile", None)
            if not profile or not profile.can_fix:
                errors["resolved_by"] = "This user cannot resolve tickets."
            elif profile.requires_proof and not self.proof_image:
                errors["proof_image"] = "Proof image is required for resolution."

        if errors:
            raise ValidationError(errors)

    # ✅ Save wrapped in transaction (no direct audit here)
    def save(self, *args, **kwargs):
        with transaction.atomic():
            is_new = self._state.adding
            self.full_clean()
            super().save(*args, **kwargs)

            if is_new:
                # Auto-update ticket status if not already resolved/closed
                if self.ticket.status not in {Ticket.Status.RESOLVED, Ticket.Status.CLOSED}:
                    self.ticket.status = Ticket.Status.RESOLVED
                    self.ticket.save(update_fields=["status", "updated_at"])

    def __str__(self):
        return f"Resolution for Ticket #{self.ticket.id} by {self.resolved_by}"


# =====================================================
# 📝 Audit Log
# =====================================================
class AuditLog(models.Model):
    class Action(models.TextChoices):
        # 🔐 Auth / user management
        USER_CREATED = "User Created", "User Created"
        USER_PROFILE_CREATED = "User Profile Created", "User Profile Created"
        ROLE_ASSIGNED = "Role Assigned", "Role Assigned"
        OTP_VERIFIED = "OTP Verified", "OTP Verified"
        OTP_RESENT = "OTP Resent", "OTP Resent"
        INVITE_CREATED = "Invite Created", "Invite Created"
        INVITE_ACCEPTED = "Invite Accepted", "Invite Accepted"
        INVITE_APPROVED = "Invite Approved", "Invite Approved"
        INVITE_REJECTED = "Invite Rejected", "Invite Rejected"
        PASSWORD_RESET_REQUESTED = "Password Reset Requested", "Password Reset Requested"
        PASSWORD_RESET_CONFIRMED = "Password Reset Confirmed", "Password Reset Confirmed"
        LOGIN = "Login", "Login"
        LOGOUT = "Logout", "Logout"
        LOGIN_FAILED = "Login Failed", "Login Failed"
        TOKEN_REFRESHED = "Token Refreshed", "Token Refreshed"

        # 📝 Ticket lifecycle
        TICKET_CREATED = "Ticket Created", "Ticket Created"
        TICKET_UPDATED = "Ticket Updated", "Ticket Updated"
        TICKET_ASSIGNED = "Ticket Assigned", "Ticket Assigned"
        TICKET_UNASSIGNED = "Ticket Unassigned", "Ticket Unassigned"
        TICKET_ACCEPTED = "Ticket Accepted", "Ticket Accepted"
        TICKET_RESOLVED = "Ticket Resolved", "Ticket Resolved"
        TICKET_CLOSED = "Ticket Closed", "Ticket Closed"
        TICKET_REOPENED = "Ticket Reopened", "Ticket Reopened"
        TICKET_ESCALATED = "Ticket Escalated", "Ticket Escalated"

    action = models.CharField(max_length=50, choices=Action.choices, db_index=True)

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
        help_text="The user who performed the action (may be null for system actions)",
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="targeted_audit_logs",
        help_text="The user who was the subject of the action",
    )
    target_invite = models.ForeignKey(
        Invite,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="If the action was related to an invite",
    )
    target_ticket = models.ForeignKey(
        Ticket,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        help_text="If the action was related to a ticket",
    )

    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["action"]),
            models.Index(fields=["timestamp"]),
            models.Index(fields=["target_ticket"]),
            models.Index(fields=["target_user"]),
            models.Index(fields=["target_invite"]),
        ]

    def __str__(self):
        performer = self.performed_by.email if self.performed_by else "System"
        return f"{self.action} by {performer} at {self.timestamp:%Y-%m-%d %H:%M:%S}"

    @classmethod
    def cleanup_old_logs(cls, days: int = 90):
        """Delete logs older than N days (default: 90)."""
        cutoff = timezone.now() - timedelta(days=days)
        cls.objects.filter(timestamp__lt=cutoff).delete()


# =====================================================
# 🛠️ Helper (safe audit creation)
# =====================================================
def create_audit(
    action: str,
    performed_by=None,
    target_user=None,
    target_invite=None,
    target_ticket=None,
    details: str = "",
):
    """Safe audit log creator with action validation."""
    if action not in AuditLog.Action.values:
        return None

    try:
        return AuditLog.objects.create(
            action=action,
            performed_by=performed_by,
            target_user=target_user,
            target_invite=target_invite,
            target_ticket=target_ticket,
            details=details or "",
        )
    except Exception as e:
        logger.error(f"[AuditLog] Failed to create log ({action}): {e}")
        return None


# =====================================================
# 🔔 UserProfile signals
# =====================================================
@receiver(post_save, sender=UserProfile)
def log_user_profile_events(sender, instance, created, **kwargs):
    if created:
        create_audit(
            AuditLog.Action.USER_PROFILE_CREATED,
            performed_by=None,  # system action
            target_user=instance.user,
            details=f"UserProfile created for {instance.user.email} with role {instance.role}.",
        )
    elif hasattr(instance, "has_changed") and instance.has_changed("role"):
        create_audit(
            AuditLog.Action.ROLE_ASSIGNED,
            performed_by=getattr(instance, "_performed_by", None),
            target_user=instance.user,
            details=f"Role updated to {instance.role} for {instance.user.email}.",
        )


# =====================================================
# 🔔 Ticket signals
# =====================================================
@receiver(post_save, sender=Ticket)
def log_ticket_events(sender, instance, created, **kwargs):
    performed_by = getattr(instance, "_performed_by", None)

    if created:
        create_audit(
            AuditLog.Action.TICKET_CREATED,
            performed_by=performed_by or instance.reporter,
            target_ticket=instance,
            details=f"Ticket #{instance.id} created with category {instance.category}.",
        )
    else:
        if hasattr(instance, "has_changed") and instance.has_changed("status"):
            action_map = {
                sender.Status.RESOLVED: AuditLog.Action.TICKET_RESOLVED,
                sender.Status.CLOSED: AuditLog.Action.TICKET_CLOSED,
                sender.Status.REOPENED: AuditLog.Action.TICKET_REOPENED,
            }
            action = action_map.get(instance.status, AuditLog.Action.TICKET_UPDATED)
            create_audit(
                action,
                performed_by=performed_by,
                target_ticket=instance,
                details=f"Ticket #{instance.id} status changed to {instance.status}.",
            )
        elif hasattr(instance, "has_changed") and instance.has_changed("escalation_level"):
            create_audit(
                AuditLog.Action.TICKET_ESCALATED,
                performed_by=performed_by,
                target_ticket=instance,
                details=f"Ticket #{instance.id} escalated to {instance.escalation_level}.",
            )


@receiver(post_save, sender=TicketAssignment)
def log_ticket_assignment(sender, instance, created, **kwargs):
    performed_by = getattr(instance, "_performed_by", None)

    if created:
        create_audit(
            AuditLog.Action.TICKET_ASSIGNED,
            performed_by=performed_by,
            target_user=instance.user,
            target_ticket=instance.ticket,
            details=f"Ticket #{instance.ticket.id} assigned to {instance.user.email}.",
        )
    elif instance.accepted and instance.accepted_at:
        create_audit(
            AuditLog.Action.TICKET_ACCEPTED,
            performed_by=performed_by or instance.user,
            target_user=instance.user,
            target_ticket=instance.ticket,
            details=f"{instance.user.email} accepted Ticket #{instance.ticket.id}.",
        )


@receiver(post_delete, sender=TicketAssignment)
def log_ticket_unassignment(sender, instance, **kwargs):
    performed_by = getattr(instance, "_performed_by", None)
    create_audit(
        AuditLog.Action.TICKET_UNASSIGNED,
        performed_by=performed_by,
        target_user=instance.user,
        target_ticket=instance.ticket,
        details=f"Ticket #{instance.ticket.id} unassigned from {instance.user.email}.",
    )


@receiver(post_save, sender=TicketResolution)
def log_ticket_resolution(sender, instance, created, **kwargs):
    if created:
        performed_by = getattr(instance, "_performed_by", None) or instance.resolved_by
        create_audit(
            AuditLog.Action.TICKET_RESOLVED,
            performed_by=performed_by,
            target_user=instance.resolved_by,
            target_ticket=instance.ticket,
            details=f"Ticket #{instance.ticket.id} resolved by {instance.resolved_by.email}.",
        )


# =====================================================
# 🔐 Auth signal hooks
# =====================================================
def _get_ip(request):
    return getattr(request, "META", {}).get("REMOTE_ADDR", "unknown IP")


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    create_audit(
        AuditLog.Action.LOGIN,
        performed_by=user,
        details=f"User {user.email} logged in from {_get_ip(request)}.",
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    create_audit(
        AuditLog.Action.LOGOUT,
        performed_by=user,
        details=f"User {user.email} logged out.",
    )


@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    email = credentials.get("email") or credentials.get("username")
    create_audit(
        AuditLog.Action.LOGIN_FAILED,
        details=f"Failed login attempt for {email} from {_get_ip(request)}.",
    )


