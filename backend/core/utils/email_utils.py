from django.conf import settings
from django.core.mail import send_mail
import logging

logger = logging.getLogger(__name__)


def deliver_code(email: str, subject: str, body: str, code_type: str):
    """
    Deliver a code to the user via email.
    - In DEBUG mode → print to console instead of sending.
    - In production → use Django's configured EMAIL_BACKEND.
    """

    if settings.DEBUG:
        # ✅ Print to console for local testing
        print(f"📧 DEBUG [{code_type}] for {email}: {body}")
        return True

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"📨 Sent {code_type} email to {email}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to send {code_type} email to {email}: {e}")
        return False
