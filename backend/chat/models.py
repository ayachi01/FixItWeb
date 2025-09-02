from django.db import models
from django.conf import settings

class Conversation(models.Model):
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class ChatMessage(models.Model):
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.sender.username}: {self.message[:50]}'

class ChatParticipant(models.Model):
    conversation = models.ForeignKey(Conversation, related_name='participants', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    type = models.CharField(max_length=10, choices=[('user', 'User'), ('agent', 'Agent')])
    is_online = models.BooleanField(default=False)

    class Meta:
        unique_together = ['conversation', 'user']

    def __str__(self):
        return f'{self.user.username} in {self.conversation.title}'
