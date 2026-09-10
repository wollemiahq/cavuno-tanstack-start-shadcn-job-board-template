import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { isWorkingPreviewHostname } from '@/components/analytics-preview';

const STORAGE_KEY = 'cavuno:preview-ad-placements';

const BoardAdPreviewContext = createContext({
  previewAds: false,
  available: false,
  setPreviewAds: (_value: boolean) => {},
});

/** Local, nonsecret development preference; never enables real advertising. */
export function BoardAdPreviewProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [previewAds, setPreviewAdsState] = useState(false);
  const [workingPreview, setWorkingPreview] = useState(false);
  const available = enabled || workingPreview;

  useEffect(() => {
    const hosted = isWorkingPreviewHostname(window.location.hostname);
    setWorkingPreview(hosted);
    if (!enabled && !hosted) {
      setPreviewAdsState(false);
      return;
    }
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      setPreviewAdsState(stored === null ? hosted : stored === 'true');
    } catch {
      // Hosted previews still show placements when storage is unavailable.
      setPreviewAdsState(hosted);
    }
  }, [enabled]);

  function setPreviewAds(value: boolean) {
    if (!available) return;
    setPreviewAdsState(value);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // The toggle still works for the current page when storage is blocked.
    }
  }

  return (
    <BoardAdPreviewContext.Provider
      value={{
        previewAds: available && previewAds,
        available,
        setPreviewAds,
      }}
    >
      {children}
    </BoardAdPreviewContext.Provider>
  );
}

export function useBoardAdPreview() {
  return useContext(BoardAdPreviewContext);
}
