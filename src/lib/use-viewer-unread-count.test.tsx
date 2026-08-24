// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useViewerUnreadCount } from './use-viewer-unread-count';

type ViewerUnreadProps = { viewerId: string | null };

describe('useViewerUnreadCount', () => {
  it('ignores a late unread result from the previous viewer', () => {
    const initialProps: ViewerUnreadProps = {
      viewerId: 'candidate-a',
    };
    const { result, rerender } = renderHook(
      ({ viewerId }) => useViewerUnreadCount(viewerId),
      { initialProps },
    );
    const publishCandidateA = result.current[1];

    act(() => publishCandidateA(7));
    expect(result.current[0]).toBe(7);

    rerender({ viewerId: 'candidate-b' });
    const publishCandidateB = result.current[1];
    expect(result.current[0]).toBe(0);

    act(() => publishCandidateB(2));
    expect(result.current[0]).toBe(2);

    act(() => publishCandidateA(9));
    expect(result.current[0]).toBe(2);

    rerender({ viewerId: 'candidate-a' });
    const publishCandidateASecondSession = result.current[1];
    expect(result.current[0]).toBe(0);

    act(() => publishCandidateASecondSession(3));
    expect(result.current[0]).toBe(3);

    act(() => publishCandidateA(11));
    expect(result.current[0]).toBe(3);
  });
});
