from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q
import uuid


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

    USERNAME_FIELD = "email"   # 👈 login with email only
    REQUIRED_FIELDS = []       # 👈 no required username on createsuperuser

    objects = CustomUserManager()

    def __str__(self):
        return self.email


# ======================
# User Profile Extension
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

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    can_report = models.BooleanField(default=False)
    can_fix = models.BooleanField(default=False)
    can_assign = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    email_domain = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        if self.user.email:
            self.email_domain = self.user.email.split('@')[-1]

        if not self.role:
            if self.email_domain == 'student.university.edu':
                self.role = 'Student'
            elif self.email_domain == 'faculty.university.edu':
                self.role = 'Faculty'
            elif self.email_domain == 'admin.university.edu':
                self.role = 'Admin Staff'
            else:
                self.role = 'Visitor'

        if self.role in ['Student', 'Faculty', 'Admin Staff', 'Visitor',
                         'Janitorial Staff', 'Utility Worker', 'IT Support',
                         'Security Guard', 'Maintenance Officer', 'Registrar',
                         'HR', 'University Admin']:
            self.can_report = True
        if self.role in ['Janitorial Staff', 'Utility Worker', 'IT Support', 'Security Guard']:
            self.can_fix = True
        if self.role in ['Maintenance Officer', 'University Admin']:
            self.can_assign = True

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} - {self.role}"


# ======================
# Student Profile (extra info table)
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
    email = models.EmailField(unique=True)
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=50, choices=UserProfile.ROLE_CHOICES)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='invites_created')
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    requires_admin_approval = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(hours=24)
        if self.role in ['Security Guard', 'Maintenance Officer']:
            self.requires_admin_approval = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invite for {self.email} - {self.role}"


# ======================
# Student Self-Service Registration
# ======================

class StudentRegistration(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending Verification"),
        ("Verified", "Verified"),
        ("Expired", "Expired"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_registration"
    )
    otp_code = models.CharField(max_length=6)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Pending"
    )

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=15)
        super().save(*args, **kwargs)

    def is_valid(self):
        return self.status == "Pending" and self.expires_at > timezone.now()

    def __str__(self):
        return f"Student Registration - {self.user.email} ({self.status})"


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
            role = self.assigned_to.profile.role if hasattr(self.assigned_to, 'profile') else None
            allowed_categories = {
                'Janitorial Staff': ['Cleaning'],
                'Utility Worker': ['Plumbing', 'Electrical', 'Structural', 'HVAC'],
                'IT Support': ['Technology', 'Equipment'],
                'Security Guard': ['Disturbance', 'Security', 'Parking'],
            }
            if role and self.category not in allowed_categories.get(role, []):
                raise ValidationError(f'{role} cannot be assigned to {self.category} tickets.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Ticket #{self.id} - {self.status} - Escalation: {self.escalation_level}"


# ======================
# Guest Report
# ======================

class GuestReport(models.Model):
    STATUS_CHOICES = [
        ('Created', 'Created'),
        ('Assigned', 'Assigned'),
        ('In Progress', 'In Progress'),
        ('Needs Assistance', 'Needs Assistance'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]
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
            role = self.assigned_to.profile.role if hasattr(self.assigned_to, 'profile') else None
            allowed_categories = {
                'Janitorial Staff': ['Cleaning'],
                'Utility Worker': ['Plumbing', 'Electrical', 'Structural', 'HVAC'],
                'IT Support': ['Technology', 'Equipment'],
                'Security Guard': ['Disturbance', 'Security', 'Parking'],
            }
            if role and self.category not in allowed_categories.get(role, []):
                raise ValidationError(f'{role} cannot be assigned to {self.category} tickets.')

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
    proof_image = models.ImageField(upload_to='resolutions/')
    resolution_note = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    def clean(self):
        if not self.proof_image:
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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
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

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('User Created', 'User Created'),
        ('Role Assigned', 'Role Assigned'),
        ('Invite Created', 'Invite Created'),
        ('Invite Approved', 'Invite Approved'),
        ('Invite Rejected', 'Invite Rejected'),
    ]
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    target_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='targeted_audit_logs')
    target_invite = models.ForeignKey('Invite', on_delete=models.SET_NULL, null=True, blank=True)
    details = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.action} by {self.performed_by} at {self.timestamp}"
