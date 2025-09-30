# backend/core/models.py
import logging
import random
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
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

# =====================================================
# Custom User Manager
# =====================================================
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user with email login."""
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)

        # Default username from email (optional)
        extra_fields.setdefault("username", email.split("@")[0])

        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


# =====================================================
# Custom User Model
# =====================================================
class CustomUser(AbstractUser, PermissionsMixin):
    email = models.EmailField(unique=True, db_index=True)

    # Username is optional, since login uses email
    username = models.CharField(max_length=150, blank=True, null=True)

    # Remove OTP fields (handled by PasswordResetCode)
    # otp_hash = models.CharField(max_length=128, blank=True, null=True)
    # otp_created_at = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # No username required

    objects = CustomUserManager()

    def __str__(self):
        return self.email


# ======================
# 1b. UserProfile & RBAC
# ======================
class Role(models.Model):
    """
    Defines user roles (e.g., Student, Faculty, Janitorial, etc.)
    DB-driven instead of hardcoding inside the model.
    """
    name = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Permission(models.Model):
    """
    Defines permissions and allowed ticket categories per role.
    """
    role = models.OneToOneField(Role, on_delete=models.CASCADE, related_name="permissions")
    can_report = models.BooleanField(default=False)
    can_fix = models.BooleanField(default=False)
    can_assign = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)
    is_admin_level = models.BooleanField(default=False)

    # Allowed ticket categories for fixers (stored as JSON for flexibility)
    allowed_categories = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Permissions for {self.role.name}"


class DomainRoleMapping(models.Model):
    """
    Maps an email domain to a default role.
    Example: "student.university.edu" → "Student"
    """
    domain = models.CharField(max_length=100, unique=True, db_index=True)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="domain_mappings")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Domain → Role Mapping"
        verbose_name_plural = "Domain → Role Mappings"

    def __str__(self):
        return f"{self.domain} → {self.role.name}"


class UserProfile(models.Model):
    """
    User profile linked to a CustomUser, with role + permissions.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    is_email_verified = models.BooleanField(default=False)
    email_domain = models.CharField(max_length=100, blank=True)
    created_by_admin = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["role"])]

    def save(self, *args, **kwargs):
        # Track role changes
        if self.pk:
            old = UserProfile.objects.filter(pk=self.pk).values("role").first()
            if old and old["role"] != (self.role.id if self.role else None):
                setattr(self, "_role_changed", True)

        # Auto-assign email domain
        if getattr(self.user, "email", None):
            self.email_domain = self.user.email.split("@")[-1].lower()

        # Auto-assign role only for self-registered users
        if not self.role:
            mapping = DomainRoleMapping.objects.filter(domain=self.email_domain).first()
            if mapping:
                self.role = mapping.role
            else:
                # fallback role if no mapping found
                self.role, _ = Role.objects.get_or_create(name="Visitor")

        super().save(*args, **kwargs)

    # === Permissions ===
    @property
    def permissions(self):
        try:
            return self.role.permissions
        except (AttributeError, Permission.DoesNotExist):
            return None

    @property
    def can_report(self):
        return bool(self.permissions and self.permissions.can_report)

    @property
    def can_fix(self):
        return bool(self.permissions and self.permissions.can_fix)

    @property
    def requires_proof(self):
        return self.can_fix

    @property
    def can_assign(self):
        return bool(self.permissions and self.permissions.can_assign)

    @property
    def can_manage_users(self):
        return bool(self.permissions and self.permissions.can_manage_users)

    @property
    def is_admin_level(self):
        return bool(self.permissions and self.permissions.is_admin_level)

    @property
    def can_close_tickets(self):
        return self.is_admin_level

    def allowed_categories(self):
        return self.permissions.allowed_categories if self.permissions else []

    # 🔑 Find fixers eligible for a given category
    @classmethod
    def fixers_for_category(cls, category):
        return cls.objects.filter(
            role__permissions__allowed_categories__contains=[category]
        )

    def __str__(self):
        return f"{self.user.email} - {self.role.name if self.role else 'No Role'}"



class StudentProfile(models.Model):
    """
    Extends UserProfile with student-specific academic details.
    """
    user_profile = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="student_profile"
    )
    student_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        validators=[
            RegexValidator(
                regex=r"^\d{2}-\d{4}-\d{6}$",
                message="Student ID must be in the format NN-NNNN-NNNNNN (e.g., 09-3456-348946)"
            )
        ]
    )
    course_code = models.CharField(max_length=20, blank=True, null=True)
    course_name = models.CharField(max_length=255, blank=True, null=True)
    year_level = models.PositiveSmallIntegerField(blank=True, null=True)
    section = models.CharField(max_length=10, blank=True, null=True)
    college = models.CharField(max_length=255, blank=True, null=True)
    enrollment_year = models.PositiveIntegerField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["student_id"]),
            models.Index(fields=["course_code"]),
            models.Index(fields=["year_level"]),
        ]
        verbose_name = "Student Profile"
        verbose_name_plural = "Student Profiles"

    def __str__(self):
        user = getattr(self.user_profile, "user", None)
        if user:
            return f"{user.first_name} {user.last_name} ({self.student_id})".strip()
        return f"StudentProfile: {self.student_id}"




class PasswordResetCodeManager(models.Manager):
    def create_for_user(self, user):
        """
        Create a new reset code for the user.
        Ensures only one active code exists per user.
        Returns the object and the raw code (for emailing).
        """
        with transaction.atomic():
            # Mark all old active codes as used
            self.filter(user=user, is_used=False).update(is_used=True)

            # Generate raw OTP (6-digit)
            raw_code = f"{random.randint(100000, 999999)}"
            hashed_code = make_password(raw_code)

            # Save hashed version
            obj = self.create(user=user, code_hash=hashed_code)

            # Return both for external use (raw_code is sent to email)
            return obj, raw_code


class PasswordResetCode(models.Model):
    """
    OTP for password reset.
    Only one active (unused + unexpired) code is allowed per user.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_codes"
    )
    code_hash = models.CharField(max_length=128, blank=True, db_index=True)
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

    # ======================
    # Validation & Expiry
    # ======================
    def is_expired(self) -> bool:
        """Check if the OTP has expired (15 minutes)."""
        return self.created_at + timedelta(minutes=15) < timezone.now()

    def check_code(self, raw_code: str) -> bool:
        """
        Validate an OTP.
        Returns True if correct, not expired, and not already used.
        """
        if self.is_used or self.is_expired():
            return False
        return check_password(raw_code, self.code_hash)

    def mark_used(self):
        """Mark the OTP as used (after successful reset)."""
        self.is_used = True
        self.save(update_fields=["is_used"])

    # ======================
    # Cleanup
    # ======================
    @classmethod
    def cleanup_expired(cls):
        """
        Delete all expired or already used reset codes.
        Called by Celery / cron / management command.
        """
        now = timezone.now()
        expired = cls.objects.filter(
            models.Q(is_used=True) | models.Q(created_at__lt=now - timedelta(minutes=15))
        )
        count = expired.count()
        expired.delete()
        return count

    def __str__(self):
        status = "used" if self.is_used else "active"
        return f"PasswordResetCode for {self.user.email} ({status})"


class Invite(models.Model):
    """
    Invitation system to onboard privileged users (fixers/admins).
    Normal users self-register, but fixers/admins require an invite.
    """
    email = models.EmailField(db_index=True)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)

    # ✅ Role from DB
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="invites")

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

        # ✅ Delegate approval rule to Role model instead of hardcoding
        if self.role and getattr(self.role, "requires_admin_approval", False):
            self.requires_admin_approval = True

        super().save(*args, **kwargs)

    # =====================================================
    # ⏳ Expiration & Usage Enforcement
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
        return not (
            self.is_used
            or self.is_expired
            or (self.requires_admin_approval and not self.is_approved)
        )

    def mark_used(self, user=None):
        """Mark the invite as used and optionally log who approved/used it."""
        if self.is_used:
            raise ValidationError("This invite has already been used.")
        if self.is_expired:
            raise ValidationError("This invite has expired.")
        if self.requires_admin_approval and not self.is_approved:
            raise ValidationError("This invite requires admin approval before it can be used.")

        self.is_used = True
        if user:
            self.approved_by = user
            self.approved_at = timezone.now()
        self.save(update_fields=["is_used", "approved_by", "approved_at"])
        return True

    def __str__(self):
        return f"Invite for {self.email} - {self.role.name}"


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

    # 🆕 New field: Title
    title = models.CharField(max_length=255, db_index=True)

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
            models.Index(fields=["title"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(description=""),
                name="ticket_description_not_empty"
            ),
            models.CheckConstraint(
                check=~models.Q(title=""),
                name="ticket_title_not_empty"
            ),
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_status = getattr(self, "status", None)
        self._original_escalation_level = getattr(self, "escalation_level", None)

    # 🔒 Validation rules
    def clean(self):
        errors = {}

        # 🚫 Empty title
        if not self.title or not self.title.strip():
            errors["title"] = "Title cannot be empty."

        # 🚫 Empty description
        if not self.description or not self.description.strip():
            errors["description"] = "Description cannot be empty."

        # 🚫 Missing location
        if not self.location:
            errors["location"] = "Ticket must be linked to a location."

        # 🚫 Missing category
        if not self.category:
            errors["category"] = "Category is required."

        # 📸 Image rules (only validate after ticket exists)
        if self.pk:
            image_count = self.images.count()
            if image_count < 1:
                errors["images"] = "At least 1 image is required for a ticket."
            elif image_count > 3:
                errors["images"] = "A maximum of 3 images are allowed per ticket."

        # 🔒 Status rules
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
        return f"Ticket #{self.id} - {self.title} - {self.status} - Escalation: {self.escalation_level}"


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
        else:
            # ✅ Check fixer availability (max 3 active tickets)
            active_tickets = self.user.ticket_assignments.filter(
                ticket__status__in=[
                    Ticket.Status.CREATED,
                    Ticket.Status.ASSIGNED,
                    Ticket.Status.IN_PROGRESS
                ]
            ).count()
            if active_tickets >= 3:
                errors["user"] = f"{self.user} is already handling 3 active tickets."

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

        # ✅ Enforce max 3 images per ticket
        if self.ticket.images.count() >= 3 and not self.pk:
            raise ValidationError("A ticket cannot have more than 3 images.")

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
            elif getattr(profile, "requires_proof", False) and not self.proof_image:
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
    request=None,
):
    """Safe audit log creator with action validation + request metadata."""
    if action not in AuditLog.Action.values:
        return None

    try:
        # 🔎 Enrich details with request metadata if provided
        if request:
            ip = request.META.get("REMOTE_ADDR", "unknown IP")
            ua = request.META.get("HTTP_USER_AGENT", "unknown UA")
            details = f"{details} | IP={ip} | UA={ua}".strip()

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
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    create_audit(
        AuditLog.Action.LOGIN,
        performed_by=user,
        details=f"User {user.email} logged in.",
        request=request,
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    create_audit(
        AuditLog.Action.LOGOUT,
        performed_by=user,
        details=f"User {user.email} logged out.",
        request=request,
    )


@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    email = credentials.get("email") or credentials.get("username")
    create_audit(
        AuditLog.Action.LOGIN_FAILED,
        details=f"Failed login attempt for {email}.",
        request=request,
    )



