'use client';

import { useEffect, useState } from 'react';

import { MessagesNavLink } from '@/components/messages-nav-link';
import { useVisiblePoll } from '@/lib/use-visible-poll';
import { getUnreadCount } from '@/server/messaging';

export function MessagesNavController() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = () =>
    getUnreadCount()
      .then((result) => setUnreadCount(result.count))
      .catch(() => setUnreadCount(0));

  useEffect(() => {
    void refresh();
  }, []);

  useVisiblePoll(() => {
    void refresh();
  }, 15000);

  return <MessagesNavLink unreadCount={unreadCount} />;
}
