from rest_framework import serializers
from .models import User, Ticket, Building, Notification, ChatLog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'university_id', 'phone_number', 'accessibility_needs']

class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['id', 'description', 'building', 'room', 'category', 'urgency', 'status', 'reporter', 'assigned_to', 'photo', 'resolution_photo', 'ai_suggested_category', 'ai_suggested_urgency', 'ai_sentiment_score', 'created_at', 'updated_at', 'related_tickets']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'ticket', 'notification_type', 'message', 'created_at', 'is_read', 'delivery_method']

class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = ['id', 'name', 'campus', 'latitude', 'longitude']

class ChatLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatLog
        fields = ['id', 'user', 'ticket', 'user_message', 'bot_response', 'created_at']