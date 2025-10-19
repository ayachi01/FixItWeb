# core/tasks.py
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from core.models import Ticket, AuditLog, PasswordResetCode
from core.utils.audit import create_audit
from datetime import timedelta


# =====================================================
# Ticket Escalation Task
# =====================================================
@shared_task
def check_escalation():
    """
    Periodic Celery task to check tickets and escalate if needed.
    Runs every hour (or as configured in Celery beat).
    """
    now = timezone.now()
    count = 0

    # Only tickets that are still active (not resolved/closed)
    open_tickets = Ticket.objects.filter(
        status__in=[
            Ticket.Status.CREATED,
            Ticket.Status.ASSIGNED,
            Ticket.Status.IN_PROGRESS,
            Ticket.Status.NEEDS_ASSISTANCE,
        ]
    )

    for ticket in open_tickets:
        changed = ticket.auto_escalate(performed_by=None)  # System escalation
        if changed:
            create_audit(
                action=AuditLog.Action.TICKET_ESCALATED,
                performed_by=None,  # None = System
                target_ticket=ticket,
                details=(
                    f"[Ticket Escalation] Ticket #{ticket.id} escalated automatically "
                    f"to level '{ticket.escalation_level}' by System at {now.strftime('%Y-%m-%d %H:%M:%S')}. "
                    f"Current status: '{ticket.status}'."
                ),
            )
            count += 1

    return (
        f"[Check Escalation] Completed at {now.strftime('%Y-%m-%d %H:%M:%S')}, "
        f"total escalated tickets: {count}."
    )


# =====================================================
#  Password Reset Codes Cleanup
# =====================================================
@shared_task
def cleanup_password_reset_codes():
    """
    Periodic Celery task to clean up expired/used PasswordResetCodes.
    Runs daily (or as configured in Celery beat).
    """
    count = PasswordResetCode.cleanup_expired()
    now = timezone.now()
    return (
        f"[Cleanup PasswordResetCodes] Completed at {now.strftime('%Y-%m-%d %H:%M:%S')}, "
        f"deleted {count} expired/used password reset codes."
    )


# =====================================================
#  Audit Logs Cleanup
# =====================================================
@shared_task
def cleanup_audit_logs():
    """
    Periodic Celery task to clean up old AuditLogs based on retention policy.
    - Normal logs older than AUDIT_LOG_RETENTION_DAYS are deleted.
    - High-sensitivity logs older than AUDIT_LOG_RETENTION_HIGH_SENSITIVITY_DAYS are deleted.
    """
    now = timezone.now()
    normal_cutoff = now - timedelta(days=settings.AUDIT_LOG_RETENTION_DAYS)
    high_sens_cutoff = now - timedelta(days=settings.AUDIT_LOG_RETENTION_HIGH_SENSITIVITY_DAYS)

    # Normal logs (exclude high-sensitivity actions)
    normal_logs = AuditLog.objects.exclude(action__in=settings.AUDIT_LOG_HIGH_SENS_ACTIONS)
    deleted_normal_count, _ = normal_logs.filter(timestamp__lt=normal_cutoff).delete()

    # High-sensitivity logs
    high_sens_logs = AuditLog.objects.filter(action__in=settings.AUDIT_LOG_HIGH_SENS_ACTIONS)
    deleted_high_sens_count, _ = high_sens_logs.filter(timestamp__lt=high_sens_cutoff).delete()

    return (
        f"[Cleanup AuditLogs] Completed at {now.strftime('%Y-%m-%d %H:%M:%S')}, "
        f"deleted {deleted_normal_count} normal logs and "
        f"{deleted_high_sens_count} high-sensitivity logs. "
        f"Retention: normal={settings.AUDIT_LOG_RETENTION_DAYS}d, high-sens={settings.AUDIT_LOG_RETENTION_HIGH_SENSITIVITY_DAYS}d."
    )
