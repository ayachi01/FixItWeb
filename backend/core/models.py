from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid

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
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    can_report = models.BooleanField(default=False)
    can_fix = models.BooleanField(default=False)
    can_assign = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    email_domain = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        if not self.role and self.user.email:
            self.email_domain = self.user.email.split('@')[-1]
            if self.email_domain == 'student.university.edu':
                self.role = 'Student'
            elif self.email_domain == 'faculty.university.edu':
                self.role = 'Faculty'
            elif self.email_domain == 'admin.university.edu':
                self.role = 'Admin Staff'
        if self.role in ['Student', 'Faculty', 'Admin Staff', 'Visitor', 'Janitorial Staff', 'Utility Worker', 'IT Support', 'Security Guard', 'Maintenance Officer', 'Registrar', 'HR', 'University Admin']:
            self.can_report = True
        if self.role in ['Janitorial Staff', 'Utility Worker', 'IT Support', 'Security Guard']:
            self.can_fix = True
        if self.role in ['Maintenance Officer', 'University Admin']:
            self.can_assign = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Invite(models.Model):
    email = models.EmailField(unique=True)
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=50, choices=UserProfile.ROLE_CHOICES)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invites_created')
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

class Location(models.Model):
    id = models.AutoField(primary_key=True)
    building_name = models.CharField(max_length=100)
    floor_number = models.CharField(max_length=50)
    room_identifier = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.building_name} - Floor {self.floor_number} - {self.room_identifier}"

    class Meta:
        unique_together = ('building_name', 'floor_number', 'room_identifier')

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
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reported_tickets')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='tickets')
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    urgency = models.CharField(max_length=50, choices=URGENCY_CHOICES, default='Standard')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Created')
    escalation_level = models.CharField(max_length=20, choices=ESCALATION_CHOICES, default='None')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assigned_tickets')
    accepted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='accepted_tickets')
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
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='guest_assigned_tickets')
    accepted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    # ✅ New field: only one image per report
    image = models.ImageField(upload_to="guest_reports/", null=True, blank=True)

    def clean(self):
        # No need to check self.images anymore since only one image is allowed
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


class TicketImage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='images', null=True)
    guest_report = models.ForeignKey(GuestReport, on_delete=models.CASCADE, related_name='images', null=True)
    image_url = models.ImageField(upload_to='ticket_images/')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    guest_email = models.EmailField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

class TicketResolution(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='resolutions', null=True)
    guest_report = models.ForeignKey(GuestReport, on_delete=models.CASCADE, related_name='resolutions', null=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    proof_image = models.ImageField(upload_to='resolutions/')
    resolution_note = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    def clean(self):
        if not self.proof_image:
            raise ValidationError('Proof image is required for resolution.')

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
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True)
    guest_report = models.ForeignKey(GuestReport, on_delete=models.CASCADE, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        if self.ticket:
            return f"{self.action} on Ticket #{self.ticket.id} by {self.performed_by}"
        return f"{self.action} on Guest Report #{self.guest_report.id} by {self.performed_by}"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', null=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True)
    guest_report = models.ForeignKey(GuestReport, on_delete=models.CASCADE, null=True)
    guest_email = models.EmailField(null=True, blank=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        if self.user:
            return f"Notification for {self.user.username}: {self.message}"
        return f"Notification for {self.guest_email}: {self.message}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('User Created', 'User Created'),
        ('Role Assigned', 'Role Assigned'),
        ('Invite Created', 'Invite Created'),
        ('Invite Approved', 'Invite Approved'),
        ('Invite Rejected', 'Invite Rejected'),
    ]
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='targeted_audit_logs')
    target_invite = models.ForeignKey(Invite, on_delete=models.SET_NULL, null=True)
    details = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.action} by {self.performed_by} at {self.timestamp}"