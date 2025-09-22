# core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Superusers get University Admin
        if instance.is_superuser:
            UserProfile.objects.create(
                user=instance,
                role="University Admin",
                is_email_verified=True,
                created_by_admin=True  # 🚨 mark as bypass
            )
        else:
            # Normal users – let UserProfile.save() decide role by domain
            UserProfile.objects.create(user=instance)