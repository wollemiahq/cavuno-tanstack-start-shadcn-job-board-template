// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MagicLinkView } from './-auth.magic-link';
import {
  OAuthCompleteView,
  Route as OAuthCompleteRoute,
} from './-auth.oauth-complete';
import { Route as MagicLinkRoute } from './auth.magic-link';

import type { UrlSearchInput } from '../lib/pagination';

afterEach(() => {
  cleanup();
});

function validateSearch(
  route: typeof MagicLinkRoute | typeof OAuthCompleteRoute,
  search: UrlSearchInput,
) {
  const validate = route.options.validateSearch;
  if (!validate) {
    throw new Error(
      'The auth callback route must validate its search parameters',
    );
  }
  if ('parse' in validate) return validate.parse(search);
  if ('~standard' in validate) {
    throw new Error('The auth callback route uses an unexpected async schema');
  }
  return validate(search);
}

function renderRouted(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const stubs = ['/auth/sign-in'].map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('auth callback continuation', () => {
  it.each([
    ['magic-link', MagicLinkRoute],
    ['oauth-complete', OAuthCompleteRoute],
  ] as const)(
    'validates %s before its loader consumes returnTo',
    (_name, route) => {
      expect(
        validateSearch(route, {
          token: 'one-time-token',
          returnTo: '/\t/evil.example',
        }),
      ).toEqual({ token: 'one-time-token', returnTo: '/account' });
    },
  );

  it.each([
    ['magic-link', MagicLinkRoute],
    ['oauth-complete', OAuthCompleteRoute],
  ] as const)(
    'keeps returnTo on the %s recovery link',
    async (_name, route) => {
      const returnTo = '/jobs?q=design&selectedJob=product-designer';
      renderRouted(
        route === MagicLinkRoute ? (
          <MagicLinkView status="invalid" returnTo={returnTo} />
        ) : (
          <OAuthCompleteView status="invalid" returnTo={returnTo} />
        ),
      );

      expect(
        await screen.findByRole('link', { name: 'Sign in' }),
      ).toHaveAttribute(
        'href',
        `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
      );
    },
  );
});
