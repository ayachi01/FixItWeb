// Chat message interface
export interface ChatMessage {
  id: string;
  conversationId: string;
  message: string;
  timestamp: Date;
  sender: {
    id: string;
    name: string;
    type: 'user' | 'agent';
  };
  isRead: boolean;
}

// Chat participant interface
export interface ChatParticipant {
  id: string;
  name: string;
  type: 'user' | 'agent';
  avatar?: string;
  isOnline: boolean;
}

// Chat conversation interface
export interface ChatConversation {
  id: string;
  title: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

// View model interface
export interface ChatViewModel {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
}

// Chat logs view model interface
export interface ChatLogViewModel {
  chatLogs: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  loadChatLogs: () => Promise<void>;
  filterLogsByDate: (startDate: Date, endDate: Date) => Promise<void>;
  searchLogs: (searchTerm: string) => Promise<void>;
}
