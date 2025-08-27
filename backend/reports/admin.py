from django.contrib import admin
from .models import User, Ticket, Notification

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'university_id', 'is_staff']
    list_filter = ['role', 'is_staff']
    search_fields = ['username', 'email', 'university_id']

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['description', 'location', 'category', 'urgency', 'status', 'reporter', 'assigned_to']
    list_filter = ['category', 'urgency', 'status']
    search_fields = ['description', 'location']
    list_editable = ['status', 'assigned_to']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'ticket', 'message', 'created_at', 'is_read']
    list_filter = ['is_read']
    search_fields = ['message']