import type { ReactNode } from 'react';

import { useRouter } from '@tanstack/react-router';
import { RouterProvider } from 'react-aria-components';

import { localizeHref } from '../paraglide/runtime';

/** Keeps React Aria links on the TanStack Router and locale-aware URL seam. */
export function AppRouterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <RouterProvider
      navigate={(href) => router.navigate({ href })}
      useHref={(href) => localizeHref(href)}
    >
      {children}
    </RouterProvider>
  );
}
