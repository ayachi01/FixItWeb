from rest_framework import serializers
from .models import UserProfile, Invite, Ticket, GuestReport, Notification
from django.contrib.auth.models import User

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['user', 'role', 'is_email_verified', 'email_domain']

class InviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = ['email', 'role', 'token', 'created_at', 'expires_at', 'is_used', 'requires_admin_approval']

class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = '__all__'

    def validate(self, data):
        if 'image' in self.context['request'].FILES:
            TicketImage.objects.create(
                ticket=data.get('ticket'),
                image_url=self.context['request'].FILES['image'],
                uploaded_by=self.context['request'].user
            )
        return data

class GuestReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestReport
        fields = '__all__'

    def validate(self, data):
        if 'image' in self.context['request'].FILES:
            GuestReportImage.objects.create(
                guest_report=data.get('guest_report'),
                image_url=self.context['request'].FILES['image'],
                guest_email=data.get('guest_email')
            )
        return data

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'guest_email', 'message', 'is_read', 'created_at']