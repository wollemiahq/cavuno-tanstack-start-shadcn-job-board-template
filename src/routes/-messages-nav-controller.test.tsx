// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUnreadCount: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/server/messaging', () => ({
  getUnreadCount: mocks.getUnreadCount,
}));

import { MessagesNavController } from './-messages-nav-controller';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('MessagesNavController', () => {
  it('does not request unread state for an unverified viewer', async () => {
    vi.useFakeTimers();
    const onUnreadCount = vi.fn();

    render(
      <MessagesNavController enabled={false} onUnreadCount={onUnreadCount} />,
    );
    await act(() => vi.advanceTimersByTimeAsync(30_000));

    expect(mocks.getUnreadCount).not.toHaveBeenCalled();
    expect(onUnreadCount).toHaveBeenCalledWith(0);
  });

  it('publishes one unread source initially and every 15 seconds', async () => {
    vi.useFakeTimers();
    const onUnreadCount = vi.fn();
    mocks.getUnreadCount.mockResolvedValue({
      object: 'unread_count',
      count: 3,
    });

    render(<MessagesNavController enabled onUnreadCount={onUnreadCount} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.getUnreadCount).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(15_000));

    expect(mocks.getUnreadCount).toHaveBeenCalledTimes(2);
    expect(onUnreadCount).toHaveBeenLastCalledWith(3);
  });
});
