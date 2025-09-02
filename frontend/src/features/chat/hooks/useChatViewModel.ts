import { useState, useEffect, useCallback } from 'react';
import { ChatService } from '../services/chatService';
import type { ChatViewModel, ChatConversation } from '../types';

// Create a singleton instance of ChatService
const chatService = new ChatService();

export const useChatViewModel = (): ChatViewModel => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all conversations
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const conversation = await chatService.getConversation(id);
      setActiveConversation(conversation);
      
      // Update the conversation in the list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversation.id ? conversation : conv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (message: string) => {
    if (!activeConversation) {
      throw new Error('No active conversation');
    }

    try {
      setError(null);
      await chatService.sendMessage(activeConversation.id, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, [activeConversation]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = chatService.subscribeToMessages((data) => {
      if (data.type === 'chat_message') {
        const message = data.message;
        
        // Update conversations list
        setConversations(prev => 
          prev.map(conv => {
            if (conv.id === message.conversationId) {
              return {
                ...conv,
                messages: [...conv.messages, message],
                lastMessage: message,
                updatedAt: new Date(message.timestamp),
                unreadCount: conv.unreadCount + 1
              };
            }
            return conv;
          })
        );

        // Update active conversation if it's the current one
        if (activeConversation?.id === message.conversationId) {
          setActiveConversation(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [...prev.messages, message],
              lastMessage: message,
              updatedAt: new Date(message.timestamp)
            };
          });
        }
      }
    });

    return () => unsubscribe();
  }, [activeConversation]);

  // Load initial conversations
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    activeConversation,
    isLoading,
    error,
    sendMessage,
    loadConversation,
    loadConversations
  };
};
