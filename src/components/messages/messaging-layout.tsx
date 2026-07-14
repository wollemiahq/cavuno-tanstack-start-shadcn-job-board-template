import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function MessagingLayout({
  'aria-label': ariaLabel,
  list,
  conversation,
  mobilePane,
  listLabel = 'Conversations',
  conversationLabel = 'Selected conversation',
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
    <section
      aria-label={ariaLabel}
      className={cn(
        'rhea-theme border-border bg-card text-card-foreground grid h-[min(44rem,calc(100dvh-10rem))] min-h-[32rem] overflow-hidden rounded-xl border md:grid-cols-[22rem_minmax(0,1fr)]',
        className,
      )}
    >
      <nav
        aria-label={listLabel}
        className={cn(
          'border-border min-h-0 flex-col md:flex md:border-r',
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
    </section>
  );
}
