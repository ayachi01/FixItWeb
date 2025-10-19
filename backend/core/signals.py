import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.contrib.auth.models import update_last_login
from django.db import transaction, IntegrityError
from django.utils import timezone

from core.models import (
    Ticket, TicketAssignment, TicketResolution,
    UserProfile, AuditLog, Role, Invite
)
from core.utils.audit import create_audit

User = get_user_model()
logger = logging.getLogger(__name__)


# =====================================================
# Utility
# =====================================================
def get_remote_ip(request):
    """Safely extract remote IP address from request"""
    return getattr(request, "META", {}).get("REMOTE_ADDR", "unknown IP")


# =====================================================
# Ticket signals
# =====================================================
@receiver(post_save, sender=Ticket)
def log_ticket_events(sender, instance, created, **kwargs):
    """
    Handles ticket lifecycle logs with detailed messages.
    Prevents duplicate creation logs (view already logs creation).
    """
    performed_by = getattr(instance, "_performed_by", None)

    if created:
        # Ticket creation already logged in views
        return

    # Status changes
    if hasattr(instance, "has_changed") and instance.has_changed("status"):
        action_map = {
            Ticket.Status.RESOLVED: AuditLog.Action.TICKET_RESOLVED,
            Ticket.Status.CLOSED: AuditLog.Action.TICKET_CLOSED,
            Ticket.Status.REOPENED: AuditLog.Action.TICKET_REOPENED,
            Ticket.Status.CANCELLED: AuditLog.Action.TICKET_CANCELLED,
        }
        action = action_map.get(instance.status, AuditLog.Action.TICKET_UPDATED)
        create_audit(
            action=action,
            performed_by=performed_by,
            target_ticket=instance,
            details=(
                f"[Ticket Status Update] Ticket #{instance.id} status changed to '{instance.status}'. "
                f"Performed by: {performed_by.email if performed_by else 'System'}. "
                f"Current escalation level: {instance.escalation_level}."
            ),
        )

    # Escalation changes
    if hasattr(instance, "has_changed") and instance.has_changed("escalation_level"):
        create_audit(
            action=AuditLog.Action.TICKET_ESCALATED,
            performed_by=performed_by,
            target_ticket=instance,
            details=(
                f"[Ticket Escalation] Ticket #{instance.id} escalated automatically or manually "
                f"to level '{instance.escalation_level}'. "
                f"Performed by: {performed_by.email if performed_by else 'System'}. "
                f"Current status: {instance.status}."
            ),
        )


@receiver(post_save, sender=TicketAssignment)
def log_ticket_assignment(sender, instance, created, **kwargs):
    performed_by = getattr(instance, "_performed_by", None)

    if created:
        create_audit(
            action=AuditLog.Action.TICKET_ASSIGNED,
            performed_by=performed_by,
            target_user=instance.user,
            target_ticket=instance.ticket,
            details=(
                f"[Ticket Assignment] Ticket #{instance.ticket.id} assigned to user '{instance.user.email}'. "
                f"Performed by: {performed_by.email if performed_by else 'System'}. "
                f"Ticket current status: {instance.ticket.status}."
            ),
        )
    elif instance.accepted and instance.accepted_at:
        create_audit(
            action=AuditLog.Action.TICKET_ACCEPTED,
            performed_by=performed_by or instance.user,
            target_user=instance.user,
            target_ticket=instance.ticket,
            details=(
                f"[Ticket Acceptance] User '{instance.user.email}' accepted Ticket #{instance.ticket.id} "
                f"at {instance.accepted_at.strftime('%Y-%m-%d %H:%M:%S')}. "
                f"Performed by: {performed_by.email if performed_by else instance.user.email}."
            ),
        )


@receiver(post_delete, sender=TicketAssignment)
def log_ticket_unassignment(sender, instance, **kwargs):
    performed_by = getattr(instance, "_performed_by", None)
    create_audit(
        action=AuditLog.Action.TICKET_UNASSIGNED,
        performed_by=performed_by,
        target_user=instance.user,
        target_ticket=instance.ticket,
        details=(
            f"[Ticket Unassignment] Ticket #{instance.ticket.id} unassigned from user '{instance.user.email}'. "
            f"Performed by: {performed_by.email if performed_by else 'System'}."
        ),
    )


@receiver(post_save, sender=TicketResolution)
def log_ticket_resolution(sender, instance, created, **kwargs):
    if created:
        if instance.ticket.status not in {Ticket.Status.RESOLVED, Ticket.Status.CLOSED}:
            instance.ticket.status = Ticket.Status.RESOLVED
            instance.ticket.save(update_fields=["status", "updated_at"])

        create_audit(
            action=AuditLog.Action.TICKET_RESOLVED,
            performed_by=instance.resolved_by,
            target_user=instance.resolved_by,
            target_ticket=instance.ticket,
            details=(
                f"[Ticket Resolution] Ticket #{instance.ticket.id} resolved by user '{instance.resolved_by.email}'. "
                f"Previous status: {instance.ticket.status}. "
                f"Resolution timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}."
            ),
        )


# =====================================================
# User & Profile signals
# =====================================================
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if not created:
        return

    try:
        with transaction.atomic():
            invite = Invite.objects.filter(email=instance.email, is_used=False).first()
            if invite:
                role = invite.role
                invite.is_used = True
                invite.save(update_fields=["is_used"])
            else:
                if instance.is_superuser:
                    role, _ = Role.objects.get_or_create(
                        name="University Admin",
                        defaults={"description": "Full administrative privileges"},
                    )
                else:
                    role, _ = Role.objects.get_or_create(
                        name="Student",
                        defaults={"description": "Default role for students"},
                    )

            profile, _ = UserProfile.objects.get_or_create(
                user=instance,
                defaults={
                    "role": role,
                    "is_email_verified": True,
                    "created_by_admin": instance.is_superuser,
                },
            )

    except IntegrityError:
        logger.warning("Race condition detected for UserProfile creation: %s", instance.email)
        profile = UserProfile.objects.filter(user=instance).first()
        if not profile:
            raise

    if profile and not getattr(profile, "role", None):
        profile.role = role
        profile.save(update_fields=["role"])

    create_audit(
        action=AuditLog.Action.USER_PROFILE_CREATED,
        performed_by=instance,
        target_user=instance,
        details=(
            f"[User Profile Creation] Profile created for '{instance.email}' with role '{role.name}'. "
            f"Created by admin: {instance.is_superuser}."
        ),
    )


# =====================================================
# Auth signals
# =====================================================
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    update_last_login(sender, user)
    create_audit(
        action=AuditLog.Action.LOGIN,
        performed_by=user,
        details=(
            f"[User Login] User '{user.email}' logged in from IP {get_remote_ip(request)}. "
            f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}."
        ),
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    create_audit(
        action=AuditLog.Action.LOGOUT,
        performed_by=user,
        details=(
            f"[User Logout] User '{user.email}' logged out. "
            f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}."
        ),
    )


@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    email = credentials.get("email") or credentials.get("username")
    create_audit(
        action=AuditLog.Action.LOGIN_FAILED,
        details=(
            f"[Failed Login Attempt] Attempted login for '{email}' from IP {get_remote_ip(request)}. "
            f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}."
        ),
    )
