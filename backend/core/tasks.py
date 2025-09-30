# core/tasks.py
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from core.models import Ticket, create_audit, AuditLog, PasswordResetCode
from datetime import timedelta


@shared_task
def check_escalation():
    """
    Periodic Celery task to check tickets and escalate if needed.
    Runs every hour (or as configured in Celery beat).
    """
    now = timezone.now()
    count = 0

    # ✅ Only tickets that are still active (not resolved/closed)
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
            # 🔔 Log escalation (system-triggered)
            create_audit(
                AuditLog.Action.TICKET_ESCALATED,
                performed_by=None,  # None = System
                details=(
                    f"Ticket #{ticket.id} escalated automatically "
                    f"to {ticket.escalation_level} at {now:%Y-%m-%d %H:%M}."
                ),
            )
            count += 1

    return f"[Check Escalation] Completed at {now:%Y-%m-%d %H:%M}, escalated {count} tickets."


@shared_task
def cleanup_password_reset_codes():
    """
    Periodic Celery task to clean up expired/used PasswordResetCodes.
    Runs daily (or as configured in Celery beat).
    """
    count = PasswordResetCode.cleanup_expired()
    now = timezone.now()
    return f"[Cleanup PasswordResetCodes] Completed at {now:%Y-%m-%d %H:%M}, deleted {count} codes."


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
        f"[Cleanup AuditLogs] Completed at {now:%Y-%m-%d %H:%M}, "
        f"deleted {deleted_normal_count} normal logs, "
        f"{deleted_high_sens_count} high-sensitivity logs."
    )
