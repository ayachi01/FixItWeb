# core/signals.py
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.contrib.auth.models import update_last_login
from django.db import transaction, IntegrityError

from core.models import (
    Ticket, TicketAssignment, TicketResolution,
    UserProfile, AuditLog, Role, Invite
)
from core.utils.audit import create_audit

User = get_user_model()
logger = logging.getLogger(__name__)


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
        if hasattr(instance, "has_changed") and instance.has_changed("status"):
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
        elif hasattr(instance, "has_changed") and instance.has_changed("escalation_level"):
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


@receiver(post_save, sender=TicketResolution)
def log_ticket_resolution(sender, instance, created, **kwargs):
    if created:
        if instance.ticket.status not in {Ticket.Status.RESOLVED, Ticket.Status.CLOSED}:
            instance.ticket.status = Ticket.Status.RESOLVED
            instance.ticket.save(update_fields=["status", "updated_at"])

        create_audit(
            AuditLog.Action.TICKET_RESOLVED,
            performed_by=instance.resolved_by,
            target_user=instance.resolved_by,
            target_ticket=instance.ticket,
            details=f"Ticket #{instance.ticket.id} resolved by {instance.resolved_by.email}.",
        )


# =====================================================
# 👤 User & Profile signals (Invite-aware)
# =====================================================
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Create UserProfile safely (no duplicates) and handle role assignment.
    Marks Invite as used automatically if the user registers via an invite.
    """
    if not created:
        return

    try:
        with transaction.atomic():
            # ✅ Check if user was invited
            invite = Invite.objects.filter(email=instance.email, is_used=False).first()

            if invite:
                role = invite.role
                invite.is_used = True
                invite.save(update_fields=["is_used"])
            else:
                # fallback role
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

            profile, created_profile = UserProfile.objects.get_or_create(
                user=instance,
                defaults={
                    "role": role,
                    "is_email_verified": True,
                    "created_by_admin": instance.is_superuser,
                },
            )

    except IntegrityError:
        logger.warning("Race condition detected when creating UserProfile for %s", instance.email)
        profile = UserProfile.objects.filter(user=instance).first()
        if not profile:
            raise

    # ✅ Ensure role consistency
    if profile and not getattr(profile, "role", None):
        profile.role = role
        profile.save(update_fields=["role"])

    create_audit(
        AuditLog.Action.USER_PROFILE_CREATED,
        performed_by=instance,
        target_user=instance,
        details=f"Profile created for {instance.email} with role {role.name}.",
    )


# =====================================================
# 🔐 Auth signals
# =====================================================
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    update_last_login(sender, user)
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
