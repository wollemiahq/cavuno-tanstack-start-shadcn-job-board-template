import { Suspense, type ReactNode } from 'react';

import { Await } from '@tanstack/react-router';

/**
 * Keep non-critical streamed content inside its own boundary. TanStack's
 * `Await` does not create a boundary for a null fallback, so using it directly
 * can let a below-the-fold promise blank the whole route while it resolves.
 */
export function DeferredContent<T>({
  promise,
  children,
}: {
  promise: Promise<T>;
  children: (value: T) => ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <Await promise={promise}>{children}</Await>
    </Suspense>
  );
}
