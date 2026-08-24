// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useViewerUnreadCount } from './use-viewer-unread-count';

describe('useViewerUnreadCount', () => {
  it('ignores a late unread result from the previous viewer', () => {
    const { result, rerender } = renderHook(
      ({ viewerId }) => useViewerUnreadCount(viewerId),
      { initialProps: { viewerId: 'candidate-a' as string | null } },
    );
    const publishCandidateA = result.current[1];

    act(() => publishCandidateA(7));
    expect(result.current[0]).toBe(7);

    rerender({ viewerId: 'candidate-b' });
    const publishCandidateB = result.current[1];
    expect(result.current[0]).toBe(0);

    act(() => publishCandidateA(9));
    expect(result.current[0]).toBe(0);

    act(() => publishCandidateB(2));
    expect(result.current[0]).toBe(2);
  });
});
