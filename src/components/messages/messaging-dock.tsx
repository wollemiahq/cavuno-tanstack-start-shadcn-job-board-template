import type { ReactNode } from 'react';

import { ChevronDown, MessageSquare, X } from 'lucide-react';

import { FloatingStackItem } from '@/components/floating-stack';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UnreadCountBadge } from '@/components/unread-count-badge';
import { cn } from '@/lib/utils';

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
    <FloatingStackItem
      order={20}
      flush
      className="hidden items-end gap-3 md:flex"
    >
      {open ? (
        <>
          {conversation ? (
            <Card
              role="complementary"
              aria-label={conversationLabel}
              className="border-border h-[min(40rem,calc(100dvh-5rem))] w-[min(28rem,calc(100vw-3rem))] gap-0 rounded-t-xl rounded-b-none border border-b-0 py-0 shadow-xl ring-0"
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
            className={cn(
              'border-border h-[min(40rem,calc(100dvh-5rem))] w-80 gap-0 rounded-t-xl rounded-b-none border border-b-0 py-0 shadow-xl ring-0',
              conversation && 'hidden lg:flex',
            )}
          >
            <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
              <MessageSquare className="size-5" aria-hidden="true" />
              <p className="flex-1 font-semibold">{messagesLabel}</p>
              <UnreadCountBadge count={unreadCount} />
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
          className="bg-card h-12 w-80 justify-start rounded-t-xl rounded-b-none border-b-0 px-4 shadow-xl"
          onClick={() => onOpenChange(true)}
        >
          <MessageSquare aria-hidden="true" />
          <span className="flex-1 text-start">{messagesLabel}</span>
          <UnreadCountBadge count={unreadCount} />
        </Button>
      )}
    </FloatingStackItem>
  );
}
