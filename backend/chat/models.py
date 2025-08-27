from django.db import models
from django.conf import settings
from reports.models import Ticket

class ChatLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    response = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"Chat by {self.user.username} at {self.timestamp}"