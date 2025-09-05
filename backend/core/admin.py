from django.contrib import admin
from .models import User, Building, Ticket, Notification, ChatLog

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'role', 'university_id', 'phone_number']
    list_filter = ['role']
    search_fields = ['username', 'university_id']

@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ['name', 'campus']
    search_fields = ['name']

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['description', 'building', 'room', 'category', 'urgency', 'status', 'created_at']
    list_filter = ['status', 'urgency', 'category', 'building']
    search_fields = ['description', 'room']
    raw_id_fields = ['reporter', 'assigned_to', 'building']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'message', 'created_at', 'is_read']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['message']

@admin.register(ChatLog)
class ChatLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'ticket', 'user_message', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user_message', 'bot_response']