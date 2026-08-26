import { lazy, Suspense, type ComponentType } from 'react';

/**
 * TanStack Router Devtools — opt-in, development only.
 *
 * Not mounted. To restore the panel, import this component in
 * `src/routes/__root.tsx` and render `<RouterDevtools />` in `RootDocument`.
 *
 * Gated on `import.meta.env.DEV` so production never loads the chunk.
 * `@tanstack/react-router-devtools` stays installed for that opt-in.
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
