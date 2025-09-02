from rest_framework import serializers
from .models import Conversation, ChatMessage, ChatParticipant

class ChatParticipantSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.username')
    id = serializers.CharField(source='user.id')

    class Meta:
        model = ChatParticipant
        fields = ['id', 'name', 'type', 'is_online']

class ChatMessageSerializer(serializers.ModelSerializer):
    sender = ChatParticipantSerializer(source='sender.chatparticipant_set.first')

    class Meta:
        model = ChatMessage
        fields = ['id', 'conversation_id', 'message', 'timestamp', 'sender', 'is_read']

class ConversationSerializer(serializers.ModelSerializer):
    participants = ChatParticipantSerializer(many=True)
    messages = ChatMessageSerializer(many=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'participants', 'messages', 'created_at', 'updated_at', 'last_message', 'unread_count']

    def get_last_message(self, obj):
        last_message = obj.messages.order_by('-timestamp').first()
        if last_message:
            return ChatMessageSerializer(last_message).data
        return None

    def get_unread_count(self, obj):
        return obj.messages.filter(is_read=False).count()
