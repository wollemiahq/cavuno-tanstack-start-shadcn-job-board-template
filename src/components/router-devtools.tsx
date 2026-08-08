import { lazy, Suspense, type ComponentType } from 'react';

/**
 * TanStack Router Devtools — development only.
 *
 * Used to inspect matches, loader status, preload cache, and pending
 * navigations when chasing waterfalls / over-fetch. The import is gated on
 * `import.meta.env.DEV` so production builds drop the branch and never load
 * the panel chunk. Vite's `devtools()` plugin strips related tooling on build.
 */
const LazyRouterDevtools: ComponentType | null = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((mod) => ({
        default: mod.TanStackRouterDevtools,
      })),
    )
  : null;

export function RouterDevtools() {
  if (!LazyRouterDevtools) return null;
  return (
    <Suspense fallback={null}>
      <LazyRouterDevtools />
    </Suspense>
  );
}
