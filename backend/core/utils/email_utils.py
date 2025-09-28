# core/utils/email_utils.py
from django.conf import settings
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
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


def send_verification_email(user):
    """
    Send an email verification link to the user after registration.
    The link points to the React frontend, which will call the backend
    to activate the user.
    """
    # Generate token and UID
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    # Build verification link to frontend route
    verify_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"

    subject = "Verify your email for FixItWeb"
    body = (
        f"Hi {user.first_name},\n\n"
        f"Please verify your email by clicking the link below:\n\n"
        f"{verify_url}\n\n"
        "Thank you!"
    )

    # Send or print based on DEBUG mode
    return deliver_code(user.email, subject, body, code_type="Email Verification")
