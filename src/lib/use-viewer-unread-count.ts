'use client';

import { useCallback, useRef, useState } from 'react';

type ViewerUnreadState = {
  viewerId: string;
  count: number;
};

/** Keep late async results scoped to the viewer that initiated the request. */
export function useViewerUnreadCount(viewerId: string | null) {
  const [state, setState] = useState<ViewerUnreadState | null>(null);
  const activeViewerId = useRef(viewerId);
  activeViewerId.current = viewerId;
  const publish = useCallback(
    (count: number) => {
      if (viewerId && activeViewerId.current === viewerId) {
        setState({ viewerId, count });
      }
    },
    [viewerId],
  );
  const count = state?.viewerId === viewerId ? state.count : 0;

  return [count, publish] as const;
}
