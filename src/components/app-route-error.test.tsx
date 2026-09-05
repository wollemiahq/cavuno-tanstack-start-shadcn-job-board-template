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
 * The client-side routers below set no `defaultErrorComponent`, so the error
 * reaches the ROOT boundary — the shape of a failing root loader, and how the
 * page behaved everywhere before the router default existed. The server is
 * different, and that is what the "server render" block pins: TanStack's
 * `Match` renders a rejected loader in place using
 * `(route.errorComponent ?? defaultErrorComponent) || ErrorComponent`, and
 * never rethrows. Without a default, production HTML for a failed loader
 * carried the framework's "Something went wrong!" until hydration.
 */
import '@testing-library/jest-dom/vitest';
import { renderToString } from 'react-dom/server';

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

import {
  CLIENT_ERROR_PATH,
  resetClientErrorReports,
} from '@/lib/client-error-report';
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
  const loader = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
  const rootRoute = createRootRoute({
    // Wired like `__root.tsx`: the root supplies the `<main>` the chrome
    // would have owned.
    errorComponent: (props) => (
      <main>
        <AppRouteErrorPage
          {...props}
          loadDataSourceFacts={mocks.getDataSourceFacts}
        />
      </main>
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
    loader,
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
  return { loader };
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
  await screen.findByRole('heading', { level: 1 });
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

  it('keeps a single main landmark when it stands in for the root layout', async () => {
    await renderRejectingLoader();

    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('"Try again" re-runs the failed loader, not just the boundary', async () => {
    const { loader } = await renderRejectingLoader();
    expect(loader).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', { name: m.appError_retryAction() }),
    );

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
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

/**
 * The production shape of a loader failure: SSR of a public route whose
 * loader rejects, under a root wired like `__root.tsx`. `isServer: true`
 * selects the branch of `Match` that renders the error in place instead of
 * rethrowing; `defaultErrorComponent` is the knob under test.
 */
async function renderRejectingLoaderOnServer(
  defaultErrorComponent: typeof AppRouteErrorPage | undefined,
  options: { ownsMain?: boolean } = {},
) {
  const ownsMain = options.ownsMain ?? false;
  const rootRoute = createRootRoute({
    errorComponent: AppRouteErrorPage,
    // Like RootChrome: a route that owns <main> gets a plain div from the
    // chrome and renders the landmark itself.
    component: () =>
      ownsMain ? (
        <div id="main-content">
          <Outlet />
        </div>
      ) : (
        <main data-testid="chrome-main">
          <Outlet />
        </main>
      ),
  });
  const jobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs',
    staticData: ownsMain ? { ownsMain: true } : {},
    loader: () => Promise.reject(new Error('Board API 500')),
    component: () => <h1>Jobs</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([jobsRoute]),
    history: createMemoryHistory({ initialEntries: ['/jobs'] }),
    isServer: true,
    defaultErrorComponent,
  });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}

describe('server render of a rejecting public loader', () => {
  it('without a router default, TanStack ships its own fallback in the HTML', async () => {
    // The trap this suite guards against, pinned so a future "tidy-up" of
    // router.tsx cannot silently reintroduce it.
    const html = await renderRejectingLoaderOnServer(undefined);

    expect(html).toContain('Something went wrong!');
    expect(html).toContain('Show Error');
    expect(html).not.toContain('data-layout="app-route-error"');
  });

  it('with AppRouteErrorPage as the default, the designed page renders in place', async () => {
    const html = await renderRejectingLoaderOnServer(AppRouteErrorPage);

    expect(html).toContain(m.appError_heading());
    expect(html).toContain(m.appError_retryAction());
    expect(html).not.toContain('Something went wrong!');
    expect(html).not.toContain('<h1>Jobs</h1>');
  });

  it('renders inside the chrome without a second main landmark', async () => {
    const html = await renderRejectingLoaderOnServer(AppRouteErrorPage);

    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('data-layout="app-route-error"');
  });

  it('supplies the main landmark when it stands in for a route that owns it', async () => {
    // /jobs, /, job detail: the chrome renders div#main-content and the route
    // component owns <main>. With the component gone, the error page does.
    const html = await renderRejectingLoaderOnServer(AppRouteErrorPage, {
      ownsMain: true,
    });

    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('data-layout="app-route-error"');
  });
});

describe('AppRouteErrorPage as the router default, inside the chrome', () => {
  it('reports the error to Cavuno and adds no second main landmark', async () => {
    // The reporter's real transport: one beacon to the Worker's same-origin
    // crash path. Fresh dedupe set so an earlier test's report cannot mask
    // this one.
    resetClientErrorReports();
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon });
    const error = new Error('Board API 500');
    // Chrome stands in for RootLayout: it already owns the page's <main>.
    const rootRoute = createRootRoute({
      component: () => (
        <main>
          <Outlet />
        </main>
      ),
    });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <AppRouteErrorPage error={error} reset={vi.fn()} />,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);

    await screen.findByRole('heading', {
      level: 1,
      name: m.appError_heading(),
    });
    await waitFor(() => expect(sendBeacon).toHaveBeenCalledOnce());
    // SAFETY: the reporter's only beacon call is `sendBeacon(path, Blob)`,
    // pinned by client-error-report.test.ts; the call count above is 1.
    const [path, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(path).toBe(CLIENT_ERROR_PATH);
    expect(await blob.text()).toContain('"message":"Board API 500"');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
