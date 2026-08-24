'use client';

import { useCallback, useState } from 'react';

type ViewerUnreadState = {
  viewerId: string;
  count: number;
};

/** Keep late async results scoped to the viewer that initiated the request. */
export function useViewerUnreadCount(viewerId: string | null) {
  const [state, setState] = useState<ViewerUnreadState | null>(null);
  const publish = useCallback(
    (count: number) => {
      if (viewerId) setState({ viewerId, count });
    },
    [viewerId],
  );
  const count = state?.viewerId === viewerId ? state.count : 0;

  return [count, publish] as const;
}
