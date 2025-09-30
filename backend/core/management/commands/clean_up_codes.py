# core/management/commands/cleanup_reset_codes.py
from django.core.management.base import BaseCommand
from core.models import PasswordResetCode


class Command(BaseCommand):
    help = "Delete expired password reset codes"

    def handle(self, *args, **options):
        deleted = PasswordResetCode.cleanup_expired()
        self.stdout.write(
            self.style.SUCCESS(f"Deleted {deleted} expired reset codes.")
        )
