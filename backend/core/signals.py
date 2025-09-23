# core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import UserProfile, AuditLog

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Automatically create a UserProfile when a new CustomUser is created.
    - Superusers -> "University Admin" role, verified, bypass flag set.
    - Normal users -> let UserProfile.save() auto-assign role by domain.
    """
    if created:
        if instance.is_superuser:
            UserProfile.objects.create(
                user=instance,
                role="University Admin",
                is_email_verified=True,
                created_by_admin=True,  # 🚨 bypass email verification
            )
        else:
            UserProfile.objects.create(user=instance)


