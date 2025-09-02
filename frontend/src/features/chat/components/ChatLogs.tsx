import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, ArrowLeft } from 'lucide-react';
import { ChatList } from './chat-list/ChatList';
import { ChatWindow } from './chat-window/ChatWindow';
import { useChatViewModel } from '../hooks/useChatViewModel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChatLogsViewModel } from '../hooks/useChatLogsVIewModel';

export default function ChatLogs() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatWindow, setShowChatWindow] = useState(false);
  
  const { 
    conversations,
    activeConversation,
    isLoading: chatLoading,
    error: chatError,
    sendMessage,
    loadConversation
  } = useChatViewModel();

  const {
    chatLogs,
    isLoading: logsLoading,
    error: logsError,
    searchLogs
  } = useChatLogsViewModel();

  // Handle chat selection
  const handleChatSelect = async (chatId: string) => {
    setSelectedChatId(chatId);
    setShowChatWindow(true); // Show chat window on mobile
    await loadConversation(chatId);
  };

  // Handle back to chat list (mobile only)
  const handleBackToList = () => {
    setShowChatWindow(false);
    setSelectedChatId(null);
  };

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      await searchLogs(searchTerm);
    }
  };

  if (chatError || logsError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>{chatError || logsError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-2">
      {/* Chat List Sidebar */}
      <Card className={`w-full md:w-80 flex flex-col transition-all duration-300 ${
        showChatWindow ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Chats</h2>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        <div className="flex-1 relative">
          {chatLoading && !conversations.length ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ChatList
              conversations={conversations}
              activeChat={selectedChatId}
              onChatSelect={handleChatSelect}
            />
          )}
        </div>
      </Card>

      {/* Main Chat Window */}
      <Card className={`flex-1 flex flex-col transition-all duration-300 ${
        !showChatWindow ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Mobile Header with Back Button */}
        {showChatWindow && activeConversation && (
          <div className="md:hidden flex items-center gap-3 p-4 border-b bg-background">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{activeConversation.title}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {activeConversation.participants
                  .filter(p => p.type === 'user')
                  .map(p => p.name)
                  .join(', ')}
              </p>
            </div>
          </div>
        )}
        
        <ChatWindow
          conversation={activeConversation}
          onSendMessage={sendMessage}
          isLoading={chatLoading || logsLoading}
        />
      </Card>
    </div>
  );
}
