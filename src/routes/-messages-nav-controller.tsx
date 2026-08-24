'use client';

import { useEffect, useState } from 'react';

import { MessagesNavLink } from '@/components/messages-nav-link';
import { useVisiblePoll } from '@/lib/use-visible-poll';
import { getUnreadCount } from '@/server/messaging';

export type MessagesNavDependencies = {
  getUnreadCount: () => Promise<{ count: number }>;
  useVisiblePoll: typeof useVisiblePoll;
};

const messagesNavDependencies: MessagesNavDependencies = {
  getUnreadCount,
  useVisiblePoll,
};

export function MessagesNavController({
  enabled = true,
  onUnreadCount,
  dependencies = messagesNavDependencies,
}: {
  enabled?: boolean;
  onUnreadCount?: (count: number) => void;
  dependencies?: MessagesNavDependencies;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = () =>
    dependencies
      .getUnreadCount()
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

  dependencies.useVisiblePoll(() => refresh(), 15000, enabled, true);

  return <MessagesNavLink unreadCount={unreadCount} />;
}
