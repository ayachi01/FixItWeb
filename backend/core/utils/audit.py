from core.models import AuditLog

# Allowed actions from AuditLog
_ALLOWED_AUDIT_ACTIONS = [choice[0] for choice in AuditLog.ACTION_CHOICES]

def create_audit(action: str, performed_by=None, target_user=None, target_invite=None, details: str = ""):
    """
    Safely create an AuditLog entry only if action is allowed.
    Prevents typos or invalid actions from breaking logging.
    """
    if action not in _ALLOWED_AUDIT_ACTIONS:
        return None  # ignore invalid actions

    return AuditLog.objects.create(
        action=action,
        performed_by=performed_by,
        target_user=target_user,
        target_invite=target_invite,
        details=details or "",
    )
