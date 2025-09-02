import WebSocketService from './webSocketService';
import type { ChatMessage, ChatConversation } from '../types';
import { mockData } from '../utils/mockData';

export class ChatService {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  private wsService: WebSocketService;
  
  // For development using mock data
  private useMockData = true;

  constructor() {
    this.wsService = new WebSocketService();
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Get all conversations
  async getConversations(): Promise<ChatConversation[]> {
    if (this.useMockData) {
      return this.getMockConversations();
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/conversations`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();
      return data.conversations.map(this.transformConversation);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  // Get single conversation with messages
  async getConversation(conversationId: string): Promise<ChatConversation> {
    if (this.useMockData) {
      return this.getMockConversation(conversationId);
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/conversations/${conversationId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformConversation(data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(conversationId: string, message: string): Promise<ChatMessage> {
    if (this.useMockData) {
      return this.mockSendMessage(conversationId, message);
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformMessage(data);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Subscribe to real-time messages
  subscribeToMessages(handler: (message: any) => void) {
    return this.wsService.subscribe(handler);
  }

  // Mock data methods
  private getMockConversations(): Promise<ChatConversation[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockData.conversations);
      }, 500);
    });
  }

  private getMockConversation(conversationId: string): Promise<ChatConversation> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const conversation = mockData.conversations.find(c => c.id === conversationId);
        if (conversation) {
          resolve(conversation);
        } else {
          reject(new Error('Conversation not found'));
        }
      }, 300);
    });
  }

  private mockSendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          conversationId,
          message: text,
          timestamp: new Date(),
          sender: {
            id: 'current-user',
            name: 'You',
            type: 'user'
          },
          isRead: true
        };

        // Simulate WebSocket message
        this.wsService.sendMessage(newMessage);

        resolve(newMessage);
      }, 300);
    });
  }

  // Helper methods
  private transformConversation(data: any): ChatConversation {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      messages: data.messages?.map(this.transformMessage) || [],
      lastMessage: data.lastMessage ? this.transformMessage(data.lastMessage) : undefined,
    };
  }

  private transformMessage(data: any): ChatMessage {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
    };
  }

  // Get all chat logs
  async getChatLogs(): Promise<ChatMessage[]> {
    if (this.useMockData) {
      return mockData.messages;
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/logs`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chat logs: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages.map(this.transformMessage);
    } catch (error) {
      console.error('Error fetching chat logs:', error);
      throw error;
    }
  }

  // Get chat logs by date range
  async getChatLogsByDateRange(startDate: Date, endDate: Date): Promise<ChatMessage[]> {
    if (this.useMockData) {
      return mockData.messages.filter(msg => {
        const timestamp = new Date(msg.timestamp);
        return timestamp >= startDate && timestamp <= endDate;
      });
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/logs/filter`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!response.ok) {
        throw new Error(`Failed to filter chat logs: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages.map(this.transformMessage);
    } catch (error) {
      console.error('Error filtering chat logs:', error);
      throw error;
    }
  }

  // Search chat logs by content
  async searchChatLogs(searchTerm: string): Promise<ChatMessage[]> {
    if (this.useMockData) {
      return mockData.messages.filter(msg =>
        msg.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/logs/search`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ searchTerm }),
      });

      if (!response.ok) {
        throw new Error(`Failed to search chat logs: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages.map(this.transformMessage);
    } catch (error) {
      console.error('Error searching chat logs:', error);
      throw error;
    }
  }
}
