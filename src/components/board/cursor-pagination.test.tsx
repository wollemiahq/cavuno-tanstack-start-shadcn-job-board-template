// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CursorPagination } from './cursor-pagination';

import { m } from '@/paraglide/messages';

afterEach(cleanup);

function renderPagination(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const talentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/talent',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, talentRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('CursorPagination — cursor-only Previous/Next pager', () => {
  it('renders nothing when there is neither a previous nor a next page', () => {
    const { container } = renderPagination(
      <CursorPagination hasPrevious={false} hasNext={false} />,
    );
    expect(container.querySelector('[data-slot="pagination"]')).toBeNull();
  });

  it('renders a crawlable next anchor and never numbered page links', async () => {
    renderPagination(
      <CursorPagination
        hasPrevious={false}
        hasNext
        nextHref="/talent?cursor=abc"
      />,
    );

    const next = await screen.findByRole('link', {
      name: m.pagination_nextPageLabel(),
    });
    expect(next).toHaveAttribute('href', '/talent?cursor=abc');
    expect(
      screen.getByRole('link', { name: m.pagination_previousPageLabel() }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.queryByRole('link', { name: `${m.pagination_ariaLabel()} 2` }),
    ).toBeNull();
  });

  it('invokes the handlers only for the enabled direction', async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    renderPagination(
      <CursorPagination
        hasPrevious
        hasNext={false}
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    fireEvent.click(
      await screen.findByRole('link', {
        name: m.pagination_previousPageLabel(),
      }),
    );
    expect(onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('link', { name: m.pagination_nextPageLabel() }),
    );
    expect(onNext).not.toHaveBeenCalled();
  });
});
