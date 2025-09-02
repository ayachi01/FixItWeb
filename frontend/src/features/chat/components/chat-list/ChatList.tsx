import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import type { ChatConversation } from '../../types';

interface ChatListProps {
  conversations: ChatConversation[];
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeChat,
  onChatSelect,
}) => {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <div className="text-2xl mb-2">💬</div>
            <p className="text-sm text-center">No conversations yet</p>
          </div>
        ) : (
          conversations.map((chat) => (
            <Button
              key={chat.id}
              variant={activeChat === chat.id ? "secondary" : "ghost"}
              className="flex items-start gap-3 p-3 h-auto w-full justify-start hover:bg-muted transition-colors"
              onClick={() => onChatSelect(chat.id)}
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {chat.participants[0]?.name.charAt(0)}
                </div>
              </Avatar>

              <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium truncate text-left">{chat.title}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="flex items-center justify-between w-full">
                  <p className="text-sm text-muted-foreground truncate text-left flex-1">
                    {chat.lastMessage?.message || 'No messages yet'}
                  </p>
                  
                  {chat.unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Button>
          ))
        )}
      </div>
    </ScrollArea>
  );
};
