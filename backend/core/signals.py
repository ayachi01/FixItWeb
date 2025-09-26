# core/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed

# ✅ Import models directly without circular import
from core.models import Ticket, TicketAssignment, TicketResolution, UserProfile, AuditLog
from core.utils.audit import create_audit

User = get_user_model()


# =====================================================
# 🛠 Utility
# =====================================================
def get_remote_ip(request):
    """Safely extract remote IP address from request"""
    return getattr(request, "META", {}).get("REMOTE_ADDR", "unknown IP")


# =====================================================
# 🔔 Ticket signals
# =====================================================
@receiver(post_save, sender=Ticket)
def log_ticket_events(sender, instance, created, **kwargs):
    performed_by = getattr(instance, "_performed_by", None)

    if created:
        create_audit(
            AuditLog.Action.TICKET_CREATED,
            performed_by=performed_by or instance.reporter,
            details=f"Ticket #{instance.id} created with category {instance.category}.",
        )
    else:
        if instance.has_changed("status"):
            action_map = {
                sender.Status.RESOLVED: AuditLog.Action.TICKET_RESOLVED,
                sender.Status.CLOSED: AuditLog.Action.TICKET_CLOSED,
                sender.Status.REOPENED: AuditLog.Action.TICKET_REOPENED,
            }
            action = action_map.get(instance.status, AuditLog.Action.TICKET_UPDATED)
            create_audit(
                action,
                performed_by=performed_by,
                details=f"Ticket #{instance.id} status changed to {instance.status}.",
            )
        elif instance.has_changed("escalation_level"):
            create_audit(
                AuditLog.Action.TICKET_ESCALATED,
                performed_by=performed_by,
                details=f"Ticket #{instance.id} escalated to {instance.escalation_level}.",
            )


@receiver(post_save, sender=TicketAssignment)
def log_ticket_assignment(sender, instance, created, **kwargs):
    performed_by = getattr(instance, "_performed_by", None)

    if created:
        create_audit(
            AuditLog.Action.TICKET_ASSIGNED,
            performed_by=performed_by,
            target_user=instance.user,
            details=f"Ticket #{instance.ticket.id} assigned to {instance.user.email}.",
        )
    elif instance.accepted and instance.accepted_at:
        create_audit(
            AuditLog.Action.TICKET_ACCEPTED,
            performed_by=performed_by or instance.user,
            target_user=instance.user,
            details=f"{instance.user.email} accepted Ticket #{instance.ticket.id}.",
        )


@receiver(post_delete, sender=TicketAssignment)
def log_ticket_unassignment(sender, instance, **kwargs):
    performed_by = getattr(instance, "_performed_by", None)
    create_audit(
        AuditLog.Action.TICKET_UNASSIGNED,
        performed_by=performed_by,
        target_user=instance.user,
        details=f"Ticket #{instance.ticket.id} unassigned from {instance.user.email}.",
    )


# =====================================================
# ✅ Ticket Resolution signals
# =====================================================
@receiver(post_save, sender=TicketResolution)
def log_ticket_resolution(sender, instance, created, **kwargs):
    if created:
        # Auto-update ticket status if needed
        if instance.ticket.status not in {Ticket.Status.RESOLVED, Ticket.Status.CLOSED}:
            instance.ticket.status = Ticket.Status.RESOLVED
            instance.ticket.save(update_fields=["status", "updated_at"])

        # Audit resolution event
        create_audit(
            AuditLog.Action.TICKET_RESOLVED,
            performed_by=instance.resolved_by,
            target_user=instance.resolved_by,
            target_ticket=instance.ticket,
            details=f"Ticket #{instance.ticket.id} resolved by {instance.resolved_by.email}.",
        )


# =====================================================
# 👤 User & Profile signals
# =====================================================
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a UserProfile for each new user"""
    if created:
        if instance.is_superuser:
            profile = UserProfile.objects.create(
                user=instance,
                role=UserProfile.Role.UNIVERSITY_ADMIN,
                is_email_verified=True,
                created_by_admin=True,  # 🚨 bypass email verification
            )
        else:
            profile = UserProfile.objects.create(user=instance)

        create_audit(
        AuditLog.Action.USER_PROFILE_CREATED,
            performed_by=instance,
            target_user=instance,
            details=f"UserProfile created for {instance.email} with role {profile.role}.",
        )


# =====================================================
# 🔐 Auth signals
# =====================================================
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    create_audit(
        AuditLog.Action.LOGIN,
        performed_by=user,
        details=f"User {user.email} logged in from {get_remote_ip(request)}.",
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    create_audit(
        AuditLog.Action.LOGOUT,
        performed_by=user,
        details=f"User {user.email} logged out.",
    )


@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    email = credentials.get("email") or credentials.get("username")
    create_audit(
        AuditLog.Action.LOGIN_FAILED,
        details=f"Failed login attempt for {email} from {get_remote_ip(request)}.",
    )
