import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

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

  useEffect(() => {
    if (!enabled) {
      setPreviewAdsState(false);
      return;
    }
    try {
      setPreviewAdsState(sessionStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      // Storage can be unavailable in private or embedded browser contexts.
    }
  }, [enabled]);

  function setPreviewAds(value: boolean) {
    if (!enabled) return;
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
        previewAds: enabled && previewAds,
        available: enabled,
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
