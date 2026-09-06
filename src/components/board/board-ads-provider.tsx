'use client';
import { createContext, useContext, type ReactNode } from 'react';

import { ADS_OFF, type BoardAdsConfig } from '@/lib/board-ads';
const BoardAdsContext = createContext<BoardAdsConfig>(ADS_OFF);
export function BoardAdsProvider({
  ads,
  children,
}: {
  ads: BoardAdsConfig;
  children: ReactNode;
}) {
  return (
    <BoardAdsContext.Provider value={ads}>{children}</BoardAdsContext.Provider>
  );
}
export function useBoardAds() {
  return useContext(BoardAdsContext);
}
