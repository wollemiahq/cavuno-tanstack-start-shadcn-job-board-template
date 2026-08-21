import { lazy, Suspense, type ComponentType } from 'react';

/**
 * TanStack Router Devtools — development only.
 *
 * Used to inspect matches, loader status, preload cache, and pending
 * navigations when chasing waterfalls / over-fetch. The import is gated on
 * `import.meta.env.DEV` so production builds drop the branch and never load
 * the panel chunk. Vite's `devtools()` plugin strips related tooling on build.
 *
 * The toggle sits bottom-right so it does not overlap the preview
 * toolbar (persona/board switcher), which anchors bottom-left.
 */
type DevtoolsProps = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
};

const LazyRouterDevtools: ComponentType<DevtoolsProps> | null = import.meta.env
  .DEV
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
      <LazyRouterDevtools position="bottom-right" />
    </Suspense>
  );
}
