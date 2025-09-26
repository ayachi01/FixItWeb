# core/utils/audit.py
import logging
from django.contrib.auth import get_user_model
from core.models import AuditLog

logger = logging.getLogger(__name__)
User = get_user_model()

# ✅ Allowed actions come from TextChoices enum
_ALLOWED_AUDIT_ACTIONS = set(AuditLog.Action.values)


def create_audit(
    action: str,
    performed_by=None,
    target_user=None,
    target_invite=None,
    target_ticket=None,
    details: str = "",
):
    """
    Safely create an AuditLog entry only if action is valid.
    - Validates that action is allowed
    - Ensures performed_by is always a CustomUser (or None)
    - Never raises exceptions (fails silently, logs error)
    """

    # ✅ Validate action
    if action not in _ALLOWED_AUDIT_ACTIONS:
        logger.warning(f"[AuditLog] Ignored invalid action: {action}")
        return None

    # ✅ Ensure performed_by is a valid CustomUser instance
    if performed_by and not isinstance(performed_by, User):
        performed_by = None

    try:
        return AuditLog.objects.create(
            action=action,
            performed_by=performed_by,
            target_user=target_user,
            target_invite=target_invite,
            target_ticket=target_ticket,
            details=details.strip() if details else "",
        )
    except Exception as e:
        logger.error(f"[AuditLog] Failed to create log ({action}): {e}")
        return None
