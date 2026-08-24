// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = {
  getUnreadCount: vi.fn(),
};

import {
  MessagesNavController,
  type MessagesNavDependencies,
} from './-messages-nav-controller';

import { useVisiblePoll } from '@/lib/use-visible-poll';

const dependencies: MessagesNavDependencies = {
  getUnreadCount: mocks.getUnreadCount,
  useVisiblePoll,
};

async function renderWithRouter(node: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{node}</>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('MessagesNavController', () => {
  it('does not request unread state for an unverified viewer', async () => {
    vi.useFakeTimers();
    const onUnreadCount = vi.fn();

    await renderWithRouter(
      <MessagesNavController
        enabled={false}
        onUnreadCount={onUnreadCount}
        dependencies={dependencies}
      />,
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

    await renderWithRouter(
      <MessagesNavController
        enabled
        onUnreadCount={onUnreadCount}
        dependencies={dependencies}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.getUnreadCount).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTimeAsync(15_000));

    expect(mocks.getUnreadCount).toHaveBeenCalledTimes(2);
    expect(onUnreadCount).toHaveBeenLastCalledWith(3);
  });
});
