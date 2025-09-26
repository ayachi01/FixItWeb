from celery import shared_task
from django.utils import timezone
from core.models import Ticket, create_audit, AuditLog


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
