import { Link } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';

import { m } from '../paraglide/messages';

import { buttonVariants } from '@/components/ui/button';
import { UnreadCountBadge } from '@/components/unread-count-badge';
import { cn } from '@/lib/utils';

export function MessagesNavLink({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      to="/messages"
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'relative',
      )}
      data-test="nav-messages"
    >
      <MessageSquare aria-hidden="true" />
      <span className="sr-only">{m.messagesNavLink_label()}</span>
      <UnreadCountBadge
        count={unreadCount}
        data-test="nav-unread"
        className="absolute -end-1.5 -top-1.5"
      />
    </Link>
  );
}
