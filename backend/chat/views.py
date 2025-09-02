from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Conversation, ChatMessage
from .serializers import ConversationSerializer, ChatMessageSerializer

class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants__user=self.request.user)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=400)

        chat_message = ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            message=message
        )
        
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save()

        return Response(ChatMessageSerializer(chat_message).data)

    @action(detail=False, methods=['get'])
    def logs(self, request):
        messages = ChatMessage.objects.filter(
            conversation__participants__user=request.user
        ).order_by('-timestamp')
        return Response(ChatMessageSerializer(messages, many=True).data)

    @action(detail=False, methods=['post'])
    def filter_logs(self, request):
        start_date = request.data.get('startDate')
        end_date = request.data.get('endDate')
        
        messages = ChatMessage.objects.filter(
            conversation__participants__user=request.user,
            timestamp__range=[start_date, end_date]
        ).order_by('-timestamp')
        
        return Response(ChatMessageSerializer(messages, many=True).data)

    @action(detail=False, methods=['post'])
    def search_logs(self, request):
        search_term = request.data.get('searchTerm')
        if not search_term:
            return Response({'error': 'Search term is required'}, status=400)

        messages = ChatMessage.objects.filter(
            conversation__participants__user=request.user,
            message__icontains=search_term
        ).order_by('-timestamp')

        return Response(ChatMessageSerializer(messages, many=True).data)
