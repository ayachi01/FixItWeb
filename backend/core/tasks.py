from celery import shared_task

@shared_task
def send_guest_notification(guest_email, guest_report_id, tracking_code):
    """
    Simple async task for guest notifications.
    Just sends an email (or logs for now).
    """
    # For now, just log / print. Later you can replace with Django's EmailMessage
    print(
        f"[Guest Notification] To: {guest_email} | "
        f"Report ID: {guest_report_id} | "
        f"Tracking Code: {tracking_code}"
    )

    # Example real email (uncomment when ready):
    # from django.core.mail import send_mail
    # send_mail(
    #     subject=f"Guest Report #{guest_report_id} Created",
    #     message=f"Your report has been received. Track it with code: {tracking_code}",
    #     from_email="no-reply@fixit.com",
    #     recipient_list=[guest_email],
    # )
@shared_task
def check_escalation():
    # Placeholder task for later implementation
    print("[Check Escalation] Task called")    
