import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import type { ChatConversation, ChatMessage } from '../../types';

interface ChatWindowProps {
  conversation: ChatConversation | null;
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onSendMessage,
  isLoading
}) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    try {
      await onSendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-lg mb-2">💬</div>
          <p>Select a conversation to start chatting</p>
          <p className="text-sm mt-1 hidden md:block">Choose from the chat list on the left</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header - Hidden on mobile since we show it in parent */}
      <div className="hidden md:block p-4 border-b bg-background">
        <h3 className="font-semibold">{conversation.title}</h3>
        <p className="text-sm text-muted-foreground">
          {conversation.participants
            .filter(p => p.type === 'user')
            .map(p => p.name)
            .join(', ')}
        </p>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {conversation.messages.map((message: ChatMessage) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="flex gap-2 max-w-[85%] md:max-w-[70%]">
                {message.sender.type === 'agent' && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">
                      {message.sender.name.charAt(0)}
                    </div>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg p-3 ${
                    message.sender.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm break-words">{message.message}</p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-xs opacity-70 truncate">
                      {message.sender.name}
                    </span>
                    <span className="text-xs opacity-70 flex-shrink-0">
                      {format(new Date(message.timestamp), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
