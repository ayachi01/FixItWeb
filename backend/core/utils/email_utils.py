from django.conf import settings

def deliver_code(email: str, subject: str, body: str, code_type: str):
    """
    Deliver a code to user via email.
    In DEBUG mode → print to console instead of sending.
    """
    if settings.DEBUG:
        print(f"📧 DEBUG {code_type} for {email}: {body}")
    else:
        # TODO: hook up real email backend (e.g., SendGrid, SMTP)
        pass
