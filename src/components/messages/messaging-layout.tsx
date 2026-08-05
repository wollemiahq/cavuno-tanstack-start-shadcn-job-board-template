import type { ReactNode } from 'react';

import { m } from '../../paraglide/messages';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MessagingLayout({
  'aria-label': ariaLabel,
  list,
  conversation,
  mobilePane,
  listLabel = m.messagesPage_conversationsAriaLabel(),
  conversationLabel = m.messagesPage_conversationTitle(),
  className,
}: {
  'aria-label': string;
  list: ReactNode;
  conversation: ReactNode;
  mobilePane: 'list' | 'conversation';
  listLabel?: string;
  conversationLabel?: string;
  className?: string;
}) {
  return (
    <Card
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'border-border grid h-[min(44rem,calc(100dvh-10rem))] min-h-[32rem] gap-0 overflow-hidden rounded-xl border py-0 shadow-none ring-0 md:grid-cols-[22rem_minmax(0,1fr)]',
        className,
      )}
    >
      <nav
        aria-label={listLabel}
        className={cn(
          'border-border min-h-0 flex-col md:flex md:border-e',
          mobilePane === 'conversation' ? 'hidden' : 'flex',
        )}
      >
        {list}
      </nav>
      <section
        aria-label={conversationLabel}
        className={cn(
          'min-h-0 flex-col',
          mobilePane === 'list' ? 'hidden md:flex' : 'flex',
        )}
      >
        {conversation}
      </section>
    </Card>
  );
}
