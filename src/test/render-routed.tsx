import type { ReactElement } from 'react';

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import { act, render, type RenderResult } from '@testing-library/react';

/**
 * Mount UI under a memory router so TanStack `Link` can read the router
 * context. Await so the root match commits before synchronous queries.
 */
export async function renderRouted(ui: ReactElement): Promise<RenderResult> {
  const rootRoute = createRootRoute({
    component: () => ui,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
  let result!: RenderResult;
  await act(async () => {
    result = render(<RouterProvider router={router} />);
    await router.load();
  });
  return result;
}
