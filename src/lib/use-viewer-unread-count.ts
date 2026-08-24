'use client';

import { useCallback, useRef, useState } from 'react';

type ViewerUnreadState = {
  viewerId: string;
  count: number;
};

/** Keep late async results scoped to the viewer that initiated the request. */
export function useViewerUnreadCount(viewerId: string | null) {
  const [state, setState] = useState<ViewerUnreadState | null>(null);
  const activeViewer = useRef({ viewerId, generation: 0 });
  if (activeViewer.current.viewerId !== viewerId) {
    activeViewer.current = {
      viewerId,
      generation: activeViewer.current.generation + 1,
    };
  }
  const generation = activeViewer.current.generation;
  const publish = useCallback(
    (count: number) => {
      if (
        viewerId &&
        activeViewer.current.viewerId === viewerId &&
        activeViewer.current.generation === generation
      ) {
        setState({ viewerId, count });
      }
    },
    [generation, viewerId],
  );
  const count = state?.viewerId === viewerId ? state.count : 0;

  return [count, publish] as const;
}
