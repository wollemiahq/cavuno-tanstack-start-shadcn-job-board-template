// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

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

describe('holdHydrationOnChunkFailure', () => {
  it('holds hydration when a route chunk of a fully server-rendered page fails', async () => {
    const { router, importer } = blogRouter(failedChunk);
    await expect(
      outcome(holdHydrationOnChunkFailure(router, fullyRendered)),
    ).resolves.toBe('held');
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('lets hydration go ahead once every matched route chunk has loaded', async () => {
    const { router, importer } = blogRouter(loadedChunk);
    await expect(
      outcome(holdHydrationOnChunkFailure(router, fullyRendered)),
    ).resolves.toBe('hydrates');
    expect(importer).toHaveBeenCalledTimes(1);
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
    },
  );
});
