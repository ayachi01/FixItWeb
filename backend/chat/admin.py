from django.contrib import admin
from .models import ChatLog

@admin.register(ChatLog)
class ChatLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'message', 'response', 'timestamp', 'ticket']
    list_filter = ['timestamp']
    search_fields = ['message', 'response']