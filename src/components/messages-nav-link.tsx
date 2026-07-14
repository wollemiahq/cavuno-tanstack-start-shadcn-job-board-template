import { Link } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';

import { m } from '../paraglide/messages';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function MessagesNavLink({ unreadCount }: { unreadCount: number }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      render={<Link to="/messages" />}
      className="relative"
      data-test="nav-messages"
    >
      <MessageSquare aria-hidden="true" />
      {m.messagesNavLink_label()}
      {unreadCount > 0 ? (
        <Badge variant="destructive" data-test="nav-unread">
          {unreadCount}
        </Badge>
      ) : null}
    </Button>
  );
}
