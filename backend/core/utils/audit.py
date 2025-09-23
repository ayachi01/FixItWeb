from django.contrib.auth import get_user_model
from core.models import AuditLog

User = get_user_model()  # ✅ Always reference the custom user model

# Allowed actions from AuditLog
_ALLOWED_AUDIT_ACTIONS = [choice[0] for choice in AuditLog.ACTION_CHOICES]


def create_audit(action: str, performed_by=None, target_user=None, target_invite=None, details: str = ""):
    """
    Safely create an AuditLog entry only if action is allowed.
    Ensures performed_by is always a CustomUser (or None).
    """
    if action not in _ALLOWED_AUDIT_ACTIONS:
        return None  # ignore invalid actions

    # ✅ Ensure performed_by is a valid CustomUser instance
    if performed_by and not isinstance(performed_by, User):
        performed_by = None

    return AuditLog.objects.create(
        action=action,
        performed_by=performed_by,
        target_user=target_user,
        target_invite=target_invite,
        details=details or "",
    )
