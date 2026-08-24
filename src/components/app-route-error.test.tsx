// @vitest-environment jsdom
/**
 * The public route error backstop. Before it existed, only the six
 * authenticated candidate routes carried an `errorComponent`, so a
 * rejecting loader on a public route (a `TypeError: Failed to fetch` out of
 * `serverFnFetcher`) bubbled past every boundary and left the visitor on a
 * permanently blank page — TanStack's "wasn't caught by any route!" warning.
 *
 * The reason this surface exists is recovery, so that is what is locked: a
 * rejecting loader on a route with NO boundary of its own is caught at the
 * root and rendered, and the visitor gets both ways forward — retry in
 * place, or leave for the homepage.
 *
 * Dual-source (F1 sticky-demo): when the active source is a dead demo tenant,
 * retry loops forever. The page gains a "Switch back to your board" action
 * that clears the data-source cookie — only when dual-source facts say so.
 *
 * Note the routers below deliberately set no `defaultErrorComponent`: that
 * option would give every child route its own boundary and catch the error
 * BEFORE it ever reached the root, silently voiding what these assert. The
 * real router (src/router.tsx) sets no such default either.
 */
import '@testing-library/jest-dom/vitest';
import {
  Outlet,
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
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PreviewDataSourceFacts } from '../server/preview';

const mocks = {
  getDataSourceFacts: vi.fn<() => Promise<PreviewDataSourceFacts>>(),
};

import { AppRouteError, AppRouteErrorPage } from './app-route-error';

import { m } from '@/paraglide/messages';

/** Captures every `document.cookie = …` write. */
const cookieWrites: string[] = [];
const reloadMock = vi.fn();

beforeEach(() => {
  // TanStack only reports a caught route error to the console in development.
  // This suite exercises the production boundary contract, where the visitor
  // sees the recovery surface without a framework diagnostic alongside it.
  vi.stubEnv('NODE_ENV', 'production');
  // Default: no dual-source — keeps existing tests free of the switcher.
  mocks.getDataSourceFacts.mockResolvedValue({
    demoConfigured: false,
    demoBoardPrivate: false,
    dataSource: 'board',
  });
  cookieWrites.length = 0;
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => cookieWrites[cookieWrites.length - 1] ?? '',
    set: (value: string) => {
      cookieWrites.push(value);
    },
  });
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload: reloadMock },
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

/**
 * Mount a public route whose loader rejects, under a root route wired like
 * `__root.tsx`. The backstop is a router-level contract, so the router seam
 * is part of what is under test.
 */
async function renderRejectingLoader() {
  const caughtErrors: unknown[] = [];
  const rootRoute = createRootRoute({
    errorComponent: (props) => (
      <AppRouteErrorPage
        {...props}
        loadDataSourceFacts={mocks.getDataSourceFacts}
      />
    ),
    component: () => <Outlet />,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <h1>Home</h1>,
  });
  const companyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/companies/$companySlug',
    // The reproduced failure: a server-function fetch rejecting inside the
    // company loader's Promise.all. The route has no errorComponent of its
    // own — like every public route on this board.
    loader: () => Promise.reject(new TypeError('Failed to fetch')),
    component: () => <h1>Company</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, companyRoute]),
    history: createMemoryHistory({ initialEntries: ['/companies/acme'] }),
  });

  render(<RouterProvider router={router} />, {
    // React 19 reports caught errors unless the root provides this callback.
    // Capture the expected rejection so the test proves the boundary caught it.
    onCaughtError: (error) => caughtErrors.push(error),
  });
  await screen.findByRole('heading', { level: 1 });
  expect(caughtErrors).toHaveLength(1);
  expect(caughtErrors[0]).toBeInstanceOf(TypeError);
}

/** The surface renders a typed `Link`, so it only mounts under a router. */
async function renderInRouter(node: React.ReactNode) {
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
  render(<RouterProvider router={router} />);
  await screen.findByRole('main');
}

describe('public route error backstop', () => {
  it('catches a rejecting public loader instead of leaving a blank page', async () => {
    await renderRejectingLoader();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: m.appError_heading(),
      }),
    ).toBeVisible();
    // The dead end the bug reported: the route's own component never rendered,
    // and without the backstop nothing rendered in its place.
    expect(
      screen.queryByRole('heading', { name: 'Company' }),
    ).not.toBeInTheDocument();
  });

  it('offers the visitor both ways forward: retry in place, or leave for home', async () => {
    await renderRejectingLoader();

    expect(
      screen.getByRole('button', { name: m.appError_retryAction() }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: m.appError_homeLink() }),
    ).toHaveAttribute('href', '/');
  });

  it('renders a main landmark, since it stands in for the root layout', async () => {
    await renderRejectingLoader();

    // RootLayout (header/footer/<main>) is replaced by the errorComponent,
    // so this surface owes the page its own single main landmark.
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('retries the failed route in place rather than navigating away', async () => {
    const reset = vi.fn();
    await renderInRouter(
      <AppRouteError
        title="Something went wrong"
        description="This page didn't load."
        retryLabel="Try again"
        homeLabel="Go to homepage"
        reset={reset}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('resolves its copy through the Paraglide seam, never the raw exception', async () => {
    await renderInRouter(
      <AppRouteErrorPage
        error={new TypeError('Failed to fetch')}
        reset={vi.fn()}
        loadDataSourceFacts={mocks.getDataSourceFacts}
      />,
    );

    // A fetch failure is not visitor-facing copy.
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument();
    expect(screen.getByText(m.appError_body())).toBeVisible();
  });
});

describe('sticky-demo escape hatch on the error surface (F1)', () => {
  it('renders switch-back action when dual-source is on demo, and click writes board cookie + reloads', async () => {
    mocks.getDataSourceFacts.mockResolvedValue({
      demoConfigured: true,
      demoBoardPrivate: false,
      dataSource: 'demo',
    });
    await renderInRouter(
      <AppRouteErrorPage
        error={new TypeError('Failed to fetch')}
        reset={vi.fn()}
        loadDataSourceFacts={mocks.getDataSourceFacts}
      />,
    );

    const action = await screen.findByRole('button', {
      name: m.appError_switchToYourBoard(),
    });
    fireEvent.click(action);
    expect(
      cookieWrites.some((w) => w.includes('cavuno_data_source=board')),
    ).toBe(true);
    expect(reloadMock).toHaveBeenCalled();
  });

  it('hides the action when dataSource is board', async () => {
    mocks.getDataSourceFacts.mockResolvedValue({
      demoConfigured: true,
      demoBoardPrivate: false,
      dataSource: 'board',
    });
    await renderInRouter(
      <AppRouteErrorPage
        error={new TypeError('Failed to fetch')}
        reset={vi.fn()}
        loadDataSourceFacts={mocks.getDataSourceFacts}
      />,
    );
    await waitFor(() => expect(mocks.getDataSourceFacts).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: m.appError_switchToYourBoard() }),
    ).toBeNull();
  });

  it('hides the action when demo is not configured', async () => {
    mocks.getDataSourceFacts.mockResolvedValue({
      demoConfigured: false,
      demoBoardPrivate: false,
      dataSource: 'demo',
    });
    await renderInRouter(
      <AppRouteErrorPage
        error={new TypeError('Failed to fetch')}
        reset={vi.fn()}
        loadDataSourceFacts={mocks.getDataSourceFacts}
      />,
    );
    await waitFor(() => expect(mocks.getDataSourceFacts).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: m.appError_switchToYourBoard() }),
    ).toBeNull();
  });

  it('hides the action when facts fetch fails', async () => {
    mocks.getDataSourceFacts.mockRejectedValue(new Error('offline'));
    await renderInRouter(
      <AppRouteErrorPage
        error={new TypeError('Failed to fetch')}
        reset={vi.fn()}
        loadDataSourceFacts={mocks.getDataSourceFacts}
      />,
    );
    await waitFor(() => expect(mocks.getDataSourceFacts).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: m.appError_switchToYourBoard() }),
    ).toBeNull();
  });
});
