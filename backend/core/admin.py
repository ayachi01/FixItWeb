from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import (
    UserProfile, Invite, Location, Ticket, GuestReport,
    TicketImage, TicketResolution, TicketActionLog,
    Notification, AuditLog
)

# ✅ Always use get_user_model for AUTH_USER_MODEL
User = get_user_model()


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'is_email_verified', 'email_domain')
    search_fields = ('user__email', 'role', 'email_domain')


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'created_at', 'expires_at', 'is_used', 'requires_admin_approval')
    search_fields = ('email', 'role')


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('building_name', 'floor_number', 'room_identifier')
    search_fields = ('building_name', 'room_identifier')


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'category', 'urgency', 'escalation_level', 'reporter', 'assigned_to', 'created_at')
    search_fields = ('description', 'category')
    list_filter = ('status', 'urgency', 'escalation_level')


@admin.register(GuestReport)
class GuestReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'guest_name', 'guest_email', 'status', 'category', 'urgency', 'escalation_level', 'created_at')
    search_fields = ('guest_name', 'guest_email', 'description')


@admin.register(TicketImage)
class TicketImageAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'guest_report', 'timestamp')
    search_fields = ('ticket__id', 'guest_report__id')


@admin.register(TicketResolution)
class TicketResolutionAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'guest_report', 'resolved_by', 'timestamp')
    search_fields = ('ticket__id', 'guest_report__id')


@admin.register(TicketActionLog)
class TicketActionLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'ticket', 'guest_report', 'performed_by', 'timestamp')
    list_filter = ('action',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'guest_email', 'message', 'is_read', 'created_at')
    search_fields = ('message', 'user__email', 'guest_email')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'performed_by', 'target_user', 'timestamp')
    search_fields = ('action', 'details')
    list_filter = ('action',)
