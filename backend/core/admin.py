from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    UserProfile, Invite, Location, Ticket,
    TicketImage, TicketResolution , AuditLog
)

# ✅ Always use get_user_model for AUTH_USER_MODEL
User = get_user_model()


# -----------------------------
# User Admin (for AUTH_USER_MODEL)
# -----------------------------
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'email', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('email',)
    ordering = ('email',)

    # Fields visible in the detail page
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login',)}),
    )

    # Fields when creating a new user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'is_staff', 'is_superuser'),
        }),
    )

    def save_model(self, request, obj, form, change):
        """Auto-create or update UserProfile when a User is created/edited in Admin."""
        super().save_model(request, obj, form, change)

        # Create profile if not exists
        profile, created = UserProfile.objects.get_or_create(user=obj)

        # 🚨 Mark that this profile was created/edited in Admin
        profile.created_by_admin = True

        # If profile has no role yet, default to Student
        if not profile.role:
            profile.role = UserProfile.Roles.STUDENT

        profile.save()


admin.site.register(User, UserAdmin)


# -----------------------------
# UserProfile Admin
# -----------------------------
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'role', 'is_email_verified', 'email_domain',
        'get_can_report', 'get_can_fix', 'get_can_assign', 'get_can_manage_users'
    )
    search_fields = ('user__email', 'role', 'email_domain')
    list_filter = ('role', 'is_email_verified')

    # Computed permission columns
    def get_can_report(self, obj):
        return obj.can_report
    get_can_report.short_description = "Can Report"
    get_can_report.boolean = True

    def get_can_fix(self, obj):
        return obj.can_fix
    get_can_fix.short_description = "Can Fix"
    get_can_fix.boolean = True

    def get_can_assign(self, obj):
        return obj.can_assign
    get_can_assign.short_description = "Can Assign"
    get_can_assign.boolean = True

    def get_can_manage_users(self, obj):
        return obj.can_manage_users
    get_can_manage_users.short_description = "Manage Users"
    get_can_manage_users.boolean = True


# -----------------------------
# Other Models
# -----------------------------
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

    def assigned_to(self, obj):
        """Show all assigned users (via TicketAssignment)."""
        return ", ".join([u.email for u in obj.assignees.all()])
    assigned_to.short_description = "Assigned To"


@admin.register(TicketImage)
class TicketImageAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'timestamp')
    search_fields = ('ticket__id',)


@admin.register(TicketResolution)
class TicketResolutionAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'resolved_by', 'timestamp')
    search_fields = ('ticket__id',)





@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'performed_by', 'target_user', 'timestamp')
    search_fields = ('action', 'details')
    list_filter = ('action',)
