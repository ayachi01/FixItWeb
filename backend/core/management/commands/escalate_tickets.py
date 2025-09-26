from django.core.management.base import BaseCommand
from core.models import Ticket  # import from your models

class Command(BaseCommand):
    help = "Automatically escalates overdue tickets based on age/urgency"

    def handle(self, *args, **options):
        escalated = 0
        for ticket in Ticket.objects.all():
            if ticket.auto_escalate():
                escalated += 1
        self.stdout.write(self.style.SUCCESS(f"Escalated {escalated} tickets"))
