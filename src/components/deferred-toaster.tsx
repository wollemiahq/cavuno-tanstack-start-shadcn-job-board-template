import { lazy, Suspense, useEffect, useState } from 'react';

import { onToasterRequested } from '@/lib/deferred-toaster';

const LazyToaster = lazy(() =>
  import('@/components/ui/sonner').then(({ Toaster }) => ({
    default: Toaster,
  })),
);

/**
 * Mounts sonner's Toaster on the visitor's first pointer or key press, or as
 * soon as a toast asks for it (src/lib/action-toast.ts), whichever comes
 * first. Keeping it out of the first paint is the point; a toast raised as a
 * page loads must not wait for a click.
 */
export function DeferredToaster() {
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const request = () => setRequested(true);
    window.addEventListener('pointerdown', request, {
      once: true,
      passive: true,
      capture: true,
    });
    window.addEventListener('keydown', request, { once: true, capture: true });
    const stopListening = onToasterRequested(request);
    return () => {
      window.removeEventListener('pointerdown', request, { capture: true });
      window.removeEventListener('keydown', request, { capture: true });
      stopListening();
    };
  }, []);

  return requested ? (
    <Suspense fallback={null}>
      <LazyToaster />
    </Suspense>
  ) : null;
}
