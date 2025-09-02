import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Conversation, ChatMessage

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if user.is_authenticated:
            await self.channel_layer.group_add(
                f"user_{user.id}",
                self.channel_name
            )
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        user = self.scope["user"]
        await self.channel_layer.group_discard(
            f"user_{user.id}",
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'chat_message':
            message_data = data.get('message')
            conversation_id = message_data.get('conversationId')
            
            # Save the message to database
            message = await self.save_message(
                conversation_id,
                message_data.get('message'),
                self.scope["user"].id
            )
            
            # Broadcast to all participants
            await self.broadcast_message(conversation_id, message)

    @database_sync_to_async
    def save_message(self, conversation_id, content, sender_id):
        conversation = Conversation.objects.get(id=conversation_id)
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender_id=sender_id,
            message=content
        )
        return {
            'id': str(message.id),
            'conversationId': str(conversation_id),
            'message': content,
            'timestamp': message.timestamp.isoformat(),
            'sender': {
                'id': str(message.sender.id),
                'name': message.sender.username,
                'type': message.sender.chatparticipant_set.first().type
            },
            'isRead': message.is_read
        }

    async def broadcast_message(self, conversation_id, message):
        conversation = await database_sync_to_async(Conversation.objects.get)(id=conversation_id)
        participants = await database_sync_to_async(list)(conversation.participants.all())
        
        for participant in participants:
            await self.channel_layer.group_send(
                f"user_{participant.user.id}",
                {
                    'type': 'chat.message',
                    'message': message
                }
            )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))
