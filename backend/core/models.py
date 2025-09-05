from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'university_admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(username, email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('faculty', 'Faculty/Instructor'),
        ('administrative_staff', 'Administrative Staff'),
        ('visitor', 'Visitor/Guest'),
        ('janitorial_staff', 'Janitorial Staff'),
        ('utility_worker', 'Utility Worker/Technician'),
        ('it_support', 'IT Support'),
        ('security_guard', 'Security Guard'),
        ('maintenance_officer', 'Maintenance Officer'),
        ('admin_registrar_hr', 'Admin/Registrar/HR'),
        ('university_admin', 'University Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    university_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    accessibility_needs = models.TextField(blank=True, null=True)
    objects = UserManager()

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    class Meta:
        ordering = ['username']
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['university_id']),
        ]

class Building(models.Model):
    name = models.CharField(max_length=100, unique=True)
    campus = models.CharField(max_length=100, default='Dagupan Campus')
    latitude = models.FloatField(blank=True, null=True, validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)])
    longitude = models.FloatField(blank=True, null=True, validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)])

    def __str__(self):
        return f"{self.name} ({self.campus})"

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['campus']),
        ]

class Ticket(models.Model):
    CATEGORY_CHOICES = (
        ('plumbing', 'Plumbing'),
        ('electrical', 'Electrical'),
        ('structural', 'Structural'),
        ('equipment', 'Equipment'),
        ('cleaning', 'Cleaning'),
        ('hvac', 'HVAC'),
        ('parking', 'Parking'),
        ('disturbance', 'Disturbance'),
        ('tech', 'Tech'),
        ('security', 'Security'),
        ('other', 'Other'),
    )
    URGENCY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('accepted', 'Accepted'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='tickets_reported',
        null=True,
        blank=True
    )
    description = models.TextField()
    building = models.ForeignKey(
        Building,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets'
    )
    room = models.CharField(max_length=50, blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    ai_suggested_category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        blank=True,
        null=True
    )
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='low')
    ai_suggested_urgency = models.CharField(
        max_length=20,
        choices=URGENCY_CHOICES,
        blank=True,
        null=True
    )
    photo = models.ImageField(upload_to='tickets/%Y/%m/%d/', blank=True, null=True)
    resolution_photo = models.ImageField(upload_to='resolution_photos/%Y/%m/%d/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets_assigned'
    )
    ai_sentiment_score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    related_tickets = models.ManyToManyField(
        'self',
        blank=True,
        symmetrical=False,
        related_name='duplicates'
    )

    def __str__(self):
        return f"{self.description[:50]} - {self.building or self.room or 'No location'}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'urgency']),
            models.Index(fields=['building', 'category']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['reporter', 'status']),
            models.Index(fields=['category', 'status']),
        ]

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('status_update', 'Status Update'),
        ('assignment', 'Assignment'),
        ('comment', 'Comment'),
        ('urgent', 'Urgent Alert'),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='status_update')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    delivery_method = models.CharField(
        max_length=20,
        choices=(('push', 'Push'), ('email', 'Email')),
        default='push'
    )

    def __str__(self):
        return f"{self.notification_type} for {self.user.username}: {self.message[:50]}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['ticket', 'notification_type']),
        ]

class ChatLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='chat_logs'
    )
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='chat_logs'
    )
    user_message = models.TextField()
    bot_response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat {self.user or 'Guest'}: {self.user_message[:50]}"

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ticket', 'created_at']),
        ]