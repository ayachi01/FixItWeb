from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.contrib.auth.hashers import make_password, check_password
import uuid
import random


# ======================
# Custom User Manager
# ======================

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)

        # username is optional
        username = extra_fields.get("username", "")
        extra_fields.setdefault("username", username or email.split("@")[0])

        user = self.model(email=email, **extra_fields)
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


# ======================
# Custom User
# ======================

class CustomUser(AbstractUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True, null=True)  # 👈 optional

    # OTP fields (hashed, secure)
    otp_hash = models.CharField(max_length=128, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = "email"   # 👈 login with email only
    REQUIRED_FIELDS = []       # 👈 no username required for superuser

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    # ======================
    # OTP Methods
    # ======================
    def set_otp(self, raw_otp: str):
        """Hash and store a new OTP for the user."""
        self.otp_hash = make_password(raw_otp)
        self.otp_created_at = timezone.now()
        self.save(update_fields=["otp_hash", "otp_created_at"])

    def check_otp(self, raw_otp: str) -> bool:
        """Verify OTP against stored hash (valid for 15 minutes)."""
        if not self.otp_hash or not self.otp_created_at:
            return False
        if self.otp_created_at + timezone.timedelta(minutes=15) < timezone.now():
            return False  # expired
        return check_password(raw_otp, self.otp_hash)

    def clear_otp(self):
        """Clear OTP after use or expiration."""
        self.otp_hash = None
        self.otp_created_at = None
        self.save(update_fields=["otp_hash", "otp_created_at"])


# ======================
# User Profile Extension (RBAC Applied)
# ======================

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('Student', 'Student'),
        ('Faculty', 'Faculty'),
        ('Admin Staff', 'Admin Staff'),
        ('Visitor', 'Visitor'),
        ('Janitorial Staff', 'Janitorial Staff'),
        ('Utility Worker', 'Utility Worker'),
        ('IT Support', 'IT Support'),
        ('Security Guard', 'Security Guard'),
        ('Maintenance Officer', 'Maintenance Officer'),
        ('Registrar', 'Registrar'),
        ('HR', 'HR'),
        ('University Admin', 'University Admin'),
    ]

    # 🔑 Central role groups (RBAC)
    FIX_ROLES = ['Janitorial Staff', 'Utility Worker', 'IT Support', 'Security Guard']
    ASSIGN_ROLES = ['Maintenance Officer', 'University Admin']
    MANAGE_USER_ROLES = ['Registrar', 'HR', 'University Admin']
    ADMIN_LEVEL_ROLES = ['Registrar', 'HR', 'University Admin']

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, blank=True)
    is_email_verified = models.BooleanField(default=False)
    email_domain = models.CharField(max_length=100, blank=True)

    # ✅ keep this for admin-created users / superusers
    created_by_admin = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        """Auto-assign role based on email domain if not already set."""
        if self.user.email:
            self.email_domain = self.user.email.split('@')[-1]

        if not self.role:  # Auto-assign role only if empty
            if self.email_domain == 'student.university.edu':
                self.role = 'Student'
            elif self.email_domain == 'faculty.university.edu':
                self.role = 'Faculty'
            elif self.email_domain == 'admin.university.edu':
                self.role = 'Admin Staff'
            else:
                self.role = 'Visitor'

        super().save(*args, **kwargs)

    # ===== RBAC Rules =====
    @property
    def can_report(self) -> bool:
        return True  # ✅ Everyone can report

    @property
    def can_fix(self) -> bool:
        return self.role in self.FIX_ROLES

    @property
    def requires_proof(self) -> bool:
        return self.can_fix  # ✅ all fixers must attach proof

    @property
    def can_assign(self) -> bool:
        return self.role in self.ASSIGN_ROLES

    @property
    def can_manage_users(self) -> bool:
        return self.role in self.MANAGE_USER_ROLES

    @property
    def is_admin_level(self) -> bool:
        return self.role in self.ADMIN_LEVEL_ROLES

    @property
    def can_close_tickets(self) -> bool:
        return self.is_admin_level

    def allowed_categories(self):
        """Categories this role can be assigned to."""
        mapping = {
            'Janitorial Staff': ['Cleaning'],
            'Utility Worker': ['Plumbing', 'Electrical', 'Structural', 'HVAC'],
            'IT Support': ['Technology', 'Equipment'],
            'Security Guard': ['Disturbance', 'Security', 'Parking'],
        }
        return mapping.get(self.role, [])

    def __str__(self):
        return f"{self.user.email} - {self.role or 'No Role'}"


# ======================
# Student Profile
# ======================

class StudentProfile(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name="student_profile")
    full_name = models.CharField(max_length=255, blank=True)
    course = models.CharField(max_length=255, blank=True, null=True)
    year_level = models.PositiveIntegerField(blank=True, null=True)
    student_id = models.CharField(max_length=50, blank=True, null=True, unique=True)

    def __str__(self):
        return f"StudentProfile: {self.full_name or self.user_profile.user.email}"


# ======================
# Invite-based Registration
# ======================

class Invite(models.Model):
    email = models.EmailField()
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    role = models.CharField(max_length=50, choices=UserProfile.ROLE_CHOICES)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invites_created'
    )
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    # 🚨 NEW FIELDS
    requires_admin_approval = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_invites"
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['email', 'is_used'],
                name='unique_active_invite_per_email'
            )
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(hours=24)

        # 🚨 Require approval for sensitive roles
        if self.role in ['Security Guard', 'Maintenance Officer']:
            self.requires_admin_approval = True

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invite for {self.email} - {self.role}"


# ======================
# Locations
# ======================

class Location(models.Model):
    id = models.AutoField(primary_key=True)
    building_name = models.CharField(max_length=100)
    floor_number = models.CharField(max_length=50)
    room_identifier = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.building_name} - Floor {self.floor_number} - {self.room_identifier}"

    class Meta:
        unique_together = ('building_name', 'floor_number', 'room_identifier')


# ======================
# Ticketing System
# ======================

class Ticket(models.Model):
    STATUS_CHOICES = [
        ('Created', 'Created'),
        ('Assigned', 'Assigned'),
        ('In Progress', 'In Progress'),
        ('Needs Assistance', 'Needs Assistance'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
        ('Reopened', 'Reopened'),
    ]
    CATEGORY_CHOICES = [
        ('Cleaning', 'Cleaning'),
        ('Plumbing', 'Plumbing'),
        ('Electrical', 'Electrical'),
        ('Structural', 'Structural'),
        ('HVAC', 'HVAC'),
        ('Technology', 'Technology'),
        ('Equipment', 'Equipment'),
        ('Disturbance', 'Disturbance'),
        ('Security', 'Security'),
        ('Parking', 'Parking'),
    ]
    ESCALATION_CHOICES = [
        ('None', 'None'),
        ('Secondary', 'Secondary'),
        ('Admin', 'Admin'),
    ]
    URGENCY_CHOICES = [
        ('Standard', 'Standard'),
        ('Urgent', 'Urgent'),
    ]

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reported_tickets')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='tickets')
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    urgency = models.CharField(max_length=50, choices=URGENCY_CHOICES, default='Standard')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Created')
    escalation_level = models.CharField(max_length=20, choices=ESCALATION_CHOICES, default='None')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='assigned_tickets')
    accepted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='accepted_tickets')
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.status == 'Created' and not self.images.exists():
            raise ValidationError('At least one photo is required when creating a ticket.')

        if self.assigned_to and self.status == 'Assigned':
            profile = getattr(self.assigned_to, "profile", None)
            if not profile:
                raise ValidationError("Assigned user has no profile.")
            if not profile.can_fix:
                raise ValidationError(f"{self.assigned_to} cannot be assigned tickets.")
            if self.category not in profile.allowed_categories():
                raise ValidationError(f"{profile.role} cannot be assigned to {self.category} tickets.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Ticket #{self.id} - {self.status} - Escalation: {self.escalation_level}"


# ======================
# Guest Report
# ======================

class GuestReport(models.Model):
    STATUS_CHOICES = Ticket.STATUS_CHOICES
    CATEGORY_CHOICES = Ticket.CATEGORY_CHOICES
    URGENCY_CHOICES = Ticket.URGENCY_CHOICES

    guest_name = models.CharField(max_length=100)
    guest_email = models.EmailField()
    guest_contact = models.CharField(max_length=50)
    tracking_code = models.UUIDField(default=uuid.uuid4, editable=False)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    urgency = models.CharField(max_length=50, choices=URGENCY_CHOICES, default='Standard')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Created')
    escalation_level = models.CharField(max_length=20, choices=Ticket.ESCALATION_CHOICES, default='None')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='guest_assigned_tickets')
    accepted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    image = models.ImageField(upload_to="guest_reports/", null=True, blank=True)

    def clean(self):
        if self.assigned_to and self.status == 'Assigned':
            profile = getattr(self.assigned_to, "profile", None)
            if not profile:
                raise ValidationError("Assigned user has no profile.")
            if not profile.can_fix:
                raise ValidationError(f"{self.assigned_to} cannot be assigned tickets.")
            if self.category not in profile.allowed_categories():
                raise ValidationError(f"{profile.role} cannot be assigned to {self.category} tickets.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Guest Report #{self.id} - {self.status} - Tracking: {self.tracking_code}"


# ======================
# Ticket Attachments & Resolution
# ======================

class TicketImage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='images', null=True, blank=True)
    guest_report = models.ForeignKey(GuestReport, on_delete=models.CASCADE, related_name='images', null=True, blank=True)
    image_url = models.ImageField(upload_to='ticket_images/')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    guest_email = models.EmailField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    def clean(self):
        if not self.ticket and not self.guest_report:
            raise ValidationError("TicketImage must be linked to either a Ticket or a GuestReport.")
        if self.ticket and self.guest_report:
            raise ValidationError("TicketImage cannot be linked to both Ticket and GuestReport.")

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(ticket__isnull=False) | Q(guest_report__isnull=False),
                name="ticketimage_must_have_ticket_or_guestreport"
            )
        ]


class TicketResolution(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='resolutions', null=True, blank=True)
    guest_report = models.ForeignKey(GuestReport, on_delete=models.CASCADE, related_name='resolutions', null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    proof_image = models.ImageField(upload_to='resolutions/', null=True, blank=True)
    resolution_note = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    def clean(self):
        if not self.resolved_by:
            raise ValidationError("A resolver must be set.")
        profile = getattr(self.resolved_by, "profile", None)
        if not profile or not profile.can_fix:
            raise ValidationError("This user cannot resolve tickets.")
        if profile.requires_proof and not self.proof_image:
            raise ValidationError('Proof image is required for resolution.')

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(ticket__isnull=False) | Q(guest_report__isnull=False),
                name="ticketresolution_must_have_ticket_or_guestreport"
            )
        ]


# ======================
# Ticket Logs & Notifications
# ======================

class TicketActionLog(models.Model):
    ACTION_CHOICES = [
        ('Created', 'Created'),
        ('Assigned', 'Assigned'),
        ('In Progress', 'In Progress'),
        ('Needs Assistance', 'Needs Assistance'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
        ('Reopened', 'Reopened'),
        ('Escalated', 'Escalated'),
    ]

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True, blank=True)
    guest_report = models.ForeignKey(GuestReport, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        if self.ticket:
            return f"{self.action} on Ticket #{self.ticket.id} by {self.performed_by}"
        return f"{self.action} on Guest Report #{self.guest_report.id} by {self.performed_by}"


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True
    )
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True, blank=True)
    guest_report = models.ForeignKey(GuestReport, on_delete=models.CASCADE, null=True, blank=True)
    guest_email = models.EmailField(null=True, blank=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        if self.user:
            return f"Notification for {self.user.email}: {self.message}"
        return f"Notification for {self.guest_email}: {self.message}"


# ======================
# Audit Log
# ======================

# -------------------- AuditLog Model --------------------
class AuditLog(models.Model):
    ACTION_CHOICES = [
        # 👤 User lifecycle
        ("User Created", "User Created"),
        ("Role Assigned", "Role Assigned"),

        # 🔑 OTP flow
        ("OTP Verified", "OTP Verified"),
        ("OTP Resent", "OTP Resent"),

        # 📩 Invite flow
        ("Invite Created", "Invite Created"),
        ("Invite Accepted", "Invite Accepted"),
        ("Invite Approved", "Invite Approved"),
        ("Invite Rejected", "Invite Rejected"),

        # 🔐 Password reset
        ("Password Reset Requested", "Password Reset Requested"),
        ("Password Reset Confirmed", "Password Reset Confirmed"),

        # 🔓 Session / auth
        ("Login", "Login"),
        ("Logout", "Logout"),
        ("Token Refreshed", "Token Refreshed"),  # ✅ NEW
    ]

    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
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
        "Invite",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="If the action was related to an invite",
    )
    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        performer = self.performed_by.email if self.performed_by else "System"
        return f"{self.action} by {performer} at {self.timestamp:%Y-%m-%d %H:%M:%S}"

    @classmethod
    def cleanup_old_logs(cls, days: int = 90):
        """Delete audit logs older than X days (default 90)."""
        cutoff = timezone.now() - timezone.timedelta(days=days)
        cls.objects.filter(timestamp__lt=cutoff).delete()


# -------------------- Audit Helper --------------------

_ALLOWED_AUDIT_ACTIONS = [choice[0] for choice in AuditLog.ACTION_CHOICES]

def create_audit(action: str, performed_by=None, target_user=None, target_invite=None, details: str = ""):
    """
    Safely create an AuditLog entry only if action is allowed.
    Prevents typos or invalid actions from breaking logging.
    """
    if action not in _ALLOWED_AUDIT_ACTIONS:
        return None  # ignore invalid actions

    return AuditLog.objects.create(
        action=action,
        performed_by=performed_by,
        target_user=target_user,
        target_invite=target_invite,
        details=details or "",
    )


# ======================
# Password Reset (OTP-based)
# ======================

class PasswordResetCode(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_codes"
    )
    code = models.CharField(max_length=6)  # 6-digit OTP
    created_at = models.DateTimeField(default=timezone.now)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        """Auto-generate OTP if not provided"""
        if not self.code:
            import random
            self.code = f"{random.randint(100000, 999999)}"
        super().save(*args, **kwargs)

    def is_expired(self):
        """Expire after 15 minutes"""
        return self.created_at + timezone.timedelta(minutes=15) < timezone.now()

    def mark_used(self):
        """Mark OTP as used after password reset"""
        self.is_used = True
        self.save()

    def __str__(self):
        status = "used" if self.is_used else "active"
        return f"PasswordResetCode for {self.user.email} - {self.code} ({status})"
