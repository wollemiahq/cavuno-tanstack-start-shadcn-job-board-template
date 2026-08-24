'use client';

import { useEffect, useState } from 'react';

import { MessagesNavLink } from '@/components/messages-nav-link';
import { useVisiblePoll } from '@/lib/use-visible-poll';
import { getUnreadCount } from '@/server/messaging';

export function MessagesNavController({
  enabled = true,
  onUnreadCount,
}: {
  enabled?: boolean;
  onUnreadCount?: (count: number) => void;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = () =>
    getUnreadCount()
      .then((result) => {
        setUnreadCount(result.count);
        onUnreadCount?.(result.count);
      })
      .catch(() => {
        setUnreadCount(0);
        onUnreadCount?.(0);
      });

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      onUnreadCount?.(0);
    }
  }, [enabled, onUnreadCount]);

  useVisiblePoll(() => refresh(), 15000, enabled, true);

  return <MessagesNavLink unreadCount={unreadCount} />;
}
