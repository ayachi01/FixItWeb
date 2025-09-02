import { useState, useEffect, useCallback } from 'react';
import { ChatService } from '../services/chatService';
import type { ChatMessage, ChatLogViewModel } from '../types';

// Create a singleton instance of ChatService
const chatService = new ChatService();

export const useChatLogsViewModel = (): ChatLogViewModel => {
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chat logs
  const loadChatLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const logs = await chatService.getChatLogs();
      setChatLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter logs by date range
  const filterLogsByDate = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setIsLoading(true);
      setError(null);
      const logs = await chatService.getChatLogsByDateRange(startDate, endDate);
      setChatLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to filter chat logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search logs by content
  const searchLogs = useCallback(async (searchTerm: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const logs = await chatService.searchChatLogs(searchTerm);
      setChatLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search chat logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load logs initially
  useEffect(() => {
    loadChatLogs();
  }, [loadChatLogs]);

  return {
    chatLogs,
    isLoading,
    error,
    loadChatLogs,
    filterLogsByDate,
    searchLogs,
  };
};
