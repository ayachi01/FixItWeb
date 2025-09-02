import type { ChatConversation, ChatMessage } from '../types';

// Mock conversations data
const mockConversations: ChatConversation[] = [
    {
      id: '1',
      title: 'Maintenance Request #1234',
      participants: [
        {
          id: 'user-1',
          name: 'John Doe',
          type: 'user',
          isOnline: true
        },
        {
          id: 'agent-1',
          name: 'Maintenance Team',
          type: 'agent',
          isOnline: true
        }
      ],
      messages: [
        {
          id: '1',
          conversationId: '1',
          message: 'Hi, I have an issue with the heating system.',
          timestamp: new Date(Date.now() - 3600000),
          sender: {
            id: 'user-1',
            name: 'John Doe',
            type: 'user'
          },
          isRead: true
        },
        {
          id: '2',
          conversationId: '1',
          message: 'I understand. Can you describe the issue in more detail?',
          timestamp: new Date(Date.now() - 3000000),
          sender: {
            id: 'agent-1',
            name: 'Maintenance Team',
            type: 'agent'
          },
          isRead: true
        }
      ],
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3000000),
      unreadCount: 0
    },
    {
      id: '2',
      title: 'Plumbing Issue #5678',
      participants: [
        {
          id: 'user-2',
          name: 'Jane Smith',
          type: 'user',
          isOnline: false
        },
        {
          id: 'agent-1',
          name: 'Maintenance Team',
          type: 'agent',
          isOnline: true
        }
      ],
      messages: [
        {
          id: '3',
          conversationId: '2',
          message: 'The sink is leaking in my apartment.',
          timestamp: new Date(Date.now() - 7200000),
          sender: {
            id: 'user-2',
            name: 'Jane Smith',
            type: 'user'
          },
          isRead: true
        }
      ],
      createdAt: new Date(Date.now() - 7200000),
      updatedAt: new Date(Date.now() - 7200000),
      unreadCount: 1
    }
  ];

// Extract all messages from conversations
const allMessages: ChatMessage[] = mockConversations.reduce((acc, conv) => {
  return [...acc, ...conv.messages];
}, [] as ChatMessage[]);

// Export mock data
export const mockData = {
  messages: allMessages,
  conversations: mockConversations
};
