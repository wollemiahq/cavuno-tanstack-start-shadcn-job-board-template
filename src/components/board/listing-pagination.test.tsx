// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { overwriteGetLocale } from '../../paraglide/runtime';
import { ListingPagination } from './listing-pagination';

beforeEach(() => {
  overwriteGetLocale(() => 'en');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  overwriteGetLocale(() => 'en');
});

function renderPagination(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const jobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, jobsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('ListingPagination — owned shadcn navigation', () => {
  it('renders nothing for one page and otherwise mounts the single shadcn pagination composition', async () => {
    const { container, rerender } = renderPagination(
      <ListingPagination
        page={1}
        count={20}
        pageSize={20}
        hrefForPage={(page) => `/jobs?page=${page}`}
        onPageChange={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-slot="pagination"]')).toBeNull();

    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <ListingPagination
          page={2}
          count={60}
          pageSize={20}
          hrefForPage={(page) => `/jobs?page=${page}`}
          onPageChange={vi.fn()}
        />
      ),
    });
    const jobsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/jobs',
      component: () => null,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    rerender(<RouterProvider router={router} />);

    const pagination = await screen.findByRole('navigation', {
      name: 'Pagination',
    });
    expect(
      within(pagination).getByText('2').closest("[aria-current='page']"),
    ).not.toBeNull();
    expect(within(pagination).getByLabelText(/previous page/i)).toBeEnabled();
    expect(within(pagination).getByLabelText(/next page/i)).toBeEnabled();
    expect(
      within(pagination)
        .getAllByRole('link')
        .map((link) => link.tagName),
    ).toEqual(['A', 'A', 'A', 'A', 'A']);
    expect(within(pagination).queryByRole('button')).toBeNull();
    expect(within(pagination).getByLabelText(/previous page/i)).toHaveAttribute(
      'href',
      '/jobs?page=1',
    );
  });

  it('sends previous, numbered-page, and next choices through the URL-navigation callback', async () => {
    const onPageChange = vi.fn();
    renderPagination(
      <ListingPagination
        page={2}
        count={80}
        pageSize={20}
        hrefForPage={(page) => `/jobs?page=${page}`}
        onPageChange={onPageChange}
      />,
    );

    const pagination = await screen.findByRole('navigation', {
      name: 'Pagination',
    });
    fireEvent.click(within(pagination).getByLabelText(/previous page/i));
    fireEvent.click(within(pagination).getByText('4'));
    fireEvent.click(within(pagination).getByLabelText(/next page/i));

    expect(onPageChange.mock.calls).toEqual([[1], [4], [3]]);
  });

  it('scrolls the containing list to its top before changing pages', async () => {
    const onPageChange = vi.fn();
    const scrollIntoView = vi.fn();
    const scrollTo = vi.fn();
    const { container } = renderPagination(
      <section data-pagination-scroll-target>
        <ListingPagination
          page={2}
          count={80}
          pageSize={20}
          hrefForPage={(page) => `/jobs?page=${page}`}
          onPageChange={onPageChange}
        />
      </section>,
    );
    const next = await screen.findByLabelText(/next page/i);
    const list = container.querySelector<HTMLElement>(
      '[data-pagination-scroll-target]',
    );
    if (!list) throw new Error('Expected pagination scroll target');
    list.scrollIntoView = scrollIntoView;
    list.scrollTo = scrollTo;

    fireEvent.click(next);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    expect(scrollIntoView.mock.invocationCallOrder[0]).toBeLessThan(
      onPageChange.mock.invocationCallOrder[0]!,
    );
  });

  it('keeps compact pagination navigable at a later page', async () => {
    renderPagination(
      <ListingPagination
        compact
        page={5}
        count={180}
        pageSize={20}
        hrefForPage={(page) => `/jobs?page=${page}`}
        onPageChange={vi.fn()}
      />,
    );

    const pagination = await screen.findByRole('navigation', {
      name: 'Pagination',
    });
    expect(pagination).toHaveAttribute('data-compact', 'true');
    expect(within(pagination).getByLabelText(/previous page/i)).toHaveAttribute(
      'href',
      '/jobs?page=4',
    );
    expect(within(pagination).getByLabelText(/next page/i)).toHaveAttribute(
      'href',
      '/jobs?page=6',
    );
    expect(
      within(pagination).getByText('5').closest("[aria-current='page']"),
    ).not.toBeNull();
    expect(within(pagination).queryByRole('button')).toBeNull();
  });
});
