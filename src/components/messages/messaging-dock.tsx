import type { ReactNode } from 'react';

import { ChevronDown, MessageSquare, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function MessagingDock({
  open,
  unreadCount,
  messagesLabel,
  openMessagesLabel,
  minimizeMessagesLabel,
  closeConversationLabel,
  conversationLabel,
  onOpenChange,
  onCloseConversation,
  inbox,
  conversation,
  conversationHasOwnHeader = false,
}: {
  open: boolean;
  unreadCount: number;
  messagesLabel: string;
  openMessagesLabel: string;
  minimizeMessagesLabel: string;
  closeConversationLabel: string;
  conversationLabel: string;
  onOpenChange: (open: boolean) => void;
  onCloseConversation: () => void;
  inbox: ReactNode;
  conversation?: ReactNode;
  conversationHasOwnHeader?: boolean;
}) {
  return (
    <div className="fixed right-6 bottom-0 z-50 hidden items-end gap-3 md:flex">
      {open ? (
        <>
          {conversation ? (
            <Card
              role="complementary"
              aria-label={conversationLabel}
              className="border-border h-[min(40rem,calc(100dvh-5rem))] w-[28rem] gap-0 rounded-t-xl rounded-b-none border border-b-0 py-0 shadow-xl ring-0"
            >
              {conversationHasOwnHeader ? (
                conversation
              ) : (
                <>
                  <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
                    <p className="min-w-0 flex-1 truncate font-semibold">
                      {conversationLabel}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={closeConversationLabel}
                      onClick={onCloseConversation}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </header>
                  <div className="min-h-0 flex-1">{conversation}</div>
                </>
              )}
            </Card>
          ) : null}

          <Card
            role="complementary"
            aria-label={messagesLabel}
            className="border-border h-[min(40rem,calc(100dvh-5rem))] w-80 gap-0 rounded-t-xl rounded-b-none border border-b-0 py-0 shadow-xl ring-0"
          >
            <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
              <MessageSquare className="size-5" aria-hidden="true" />
              <p className="flex-1 font-semibold">{messagesLabel}</p>
              {unreadCount > 0 ? <Badge>{unreadCount}</Badge> : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={minimizeMessagesLabel}
                onClick={() => onOpenChange(false)}
              >
                <ChevronDown aria-hidden="true" />
              </Button>
            </header>
            <div className="min-h-0 flex-1">{inbox}</div>
          </Card>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          data-slot="messaging-dock-launcher"
          aria-label={openMessagesLabel}
          className="bg-card h-12 w-80 justify-start rounded-b-none border-b-0 px-4 shadow-xl"
          onClick={() => onOpenChange(true)}
        >
          <MessageSquare aria-hidden="true" />
          <span className="flex-1 text-left">{messagesLabel}</span>
          {unreadCount > 0 ? <Badge>{unreadCount}</Badge> : null}
        </Button>
      )}
    </div>
  );
}
