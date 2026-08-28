'use client';

import { createContext, useContext, useMemo } from 'react';

import type { BoardConversionAnalyticsConfig } from '@/lib/board-pixel-conversions';

const BoardConversionAnalyticsContext = createContext<{
  boardSlug: string;
  analytics: BoardConversionAnalyticsConfig;
} | null>(null);

export function BoardConversionAnalyticsProvider({
  boardSlug,
  analytics,
  children,
}: {
  boardSlug: string;
  analytics: BoardConversionAnalyticsConfig;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ boardSlug, analytics }),
    [boardSlug, analytics],
  );
  return (
    <BoardConversionAnalyticsContext value={value}>
      {children}
    </BoardConversionAnalyticsContext>
  );
}

export function useBoardConversionAnalytics() {
  return useContext(BoardConversionAnalyticsContext);
}
