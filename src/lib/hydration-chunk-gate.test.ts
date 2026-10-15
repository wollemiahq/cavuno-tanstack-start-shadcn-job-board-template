// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetClientErrorReports } from './client-error-report';
import {
  holdHydrationOnChunkFailure,
  type ServerRenderedMatch,
} from './hydration-chunk-gate';

/** A post route whose split component chunk loads or fails on demand. */
function blogRouter(chunk: () => Promise<{ default: () => null }>) {
  const importer = vi.fn(chunk);
  const rootRoute = createRootRoute();
  const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blog/$postSlug',
    component: lazyRouteComponent(importer),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([postRoute]),
    history: createMemoryHistory({ initialEntries: ['/blog/some-post'] }),
  });
  return { router, importer };
}

const failedChunk = () =>
  Promise.reject(
    new TypeError('Failed to fetch dynamically imported module: /assets/x.js'),
  );
const loadedChunk = () => Promise.resolve({ default: () => null });

/** A failed chunk as a Vite build delivers it: the event, then the rejection. */
const failedViteChunk = () => {
  const error = new TypeError(
    'Failed to fetch dynamically imported module: /assets/blog._postSlug-x.js',
  );
  window.dispatchEvent(
    Object.assign(new Event('vite:preloadError', { cancelable: true }), {
      payload: error,
    }),
  );
  return Promise.reject(error);
};

const fullyRendered: ServerRenderedMatch[] = [
  { s: 'success' },
  { s: 'success' },
];

/** Settles within a few ticks, or reports that it is still holding. */
async function outcome(promise: Promise<void>) {
  return Promise.race([
    promise.then(() => 'hydrates' as const),
    new Promise<'held'>((resolve) => setTimeout(() => resolve('held'), 20)),
  ]);
}

const fetchMock = vi.fn();

interface SentReport {
  name: string;
  message: string;
  path: string;
  host: string;
  kind: string | null;
}

/** The client error reports sent so far, as the Worker receives them. */
function reports(): SentReport[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  resetClientErrorReports();
  vi.stubGlobal('fetch', fetchMock);
  // No sendBeacon in jsdom: the report goes out as a keepalive fetch.
  vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
  window.history.replaceState({}, '', '/blog/some-post');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('holdHydrationOnChunkFailure', () => {
  it('holds hydration when a route chunk of a fully server-rendered page fails', async () => {
    const { router, importer } = blogRouter(failedChunk);
    await expect(
      outcome(holdHydrationOnChunkFailure(router, fullyRendered)),
    ).resolves.toBe('held');
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('reports a held page once, with the chunk error, marked as held', async () => {
    const { router } = blogRouter(failedViteChunk);
    await expect(
      outcome(holdHydrationOnChunkFailure(router, fullyRendered)),
    ).resolves.toBe('held');
    expect(reports()).toEqual([
      expect.objectContaining({
        name: 'TypeError',
        message:
          'Failed to fetch dynamically imported module: /assets/blog._postSlug-x.js',
        path: '/blog/some-post',
        host: window.location.host,
        kind: 'hydration-held',
      }),
    ]);

    // A second hold on the same document does not report again.
    await outcome(holdHydrationOnChunkFailure(router, fullyRendered));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still reports a held page when no chunk error was announced', async () => {
    const { router } = blogRouter(failedChunk);
    await outcome(holdHydrationOnChunkFailure(router, fullyRendered));
    expect(reports()).toEqual([
      expect.objectContaining({
        name: 'Error',
        message: 'Route chunk failed to load on /blog/some-post',
        kind: 'hydration-held',
      }),
    ]);
  });

  it('lets hydration go ahead once every matched route chunk has loaded', async () => {
    const { router, importer } = blogRouter(loadedChunk);
    await expect(
      outcome(holdHydrationOnChunkFailure(router, fullyRendered)),
    ).resolves.toBe('hydrates');
    expect(importer).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each<[string, ServerRenderedMatch[] | undefined]>([
    ['no server state', undefined],
    ['a pending match', [{ s: 'success' }, { s: 'pending' }]],
    [
      'a data-only match',
      [{ s: 'success' }, { s: 'success', ssr: 'data-only' }],
    ],
    ['a client-only match', [{ s: 'success' }, { s: 'success', ssr: false }]],
    ['an errored match', [{ s: 'success' }, { s: 'error' }]],
    ['a global not-found', [{ s: 'success', g: true }]],
  ])(
    'leaves the client to render the page when the server sent %s',
    async (_, matches) => {
      const { router, importer } = blogRouter(failedChunk);
      await expect(
        outcome(holdHydrationOnChunkFailure(router, matches)),
      ).resolves.toBe('hydrates');
      expect(importer).not.toHaveBeenCalled();
      // The client renders the page, and its error page reports any crash.
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
