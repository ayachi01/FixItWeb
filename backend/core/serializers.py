from rest_framework import serializers
from .models import StudentRegistration, UserProfile, Invite, Ticket, GuestReport, Notification
from django.contrib.auth.models import User
from .models import Location


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['user', 'role', 'is_email_verified', 'email_domain']


class StudentRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = StudentRegistration
        fields = ['email', 'password', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']

    def create(self, validated_data):
        """Create user + inactive profile + pending registration"""
        email = validated_data.pop("email")
        password = validated_data.pop("password")

        # Create inactive user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            is_active=False  # ✅ inactive until verified
        )

        # Create registration record
        registration = StudentRegistration.objects.create(user=user)

        return registration
    


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
        read_only_fields = ['id', 'tracking_code', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get("request")

        # ✅ Assign uploaded image if provided
        if request and "image" in request.FILES:
            validated_data["image"] = request.FILES["image"]

        # ✅ Create GuestReport directly
        report = GuestReport.objects.create(**validated_data)

        return report



class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'guest_email', 'message', 'is_read', 'created_at']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'building_name', 'floor_number', 'room_identifier']
