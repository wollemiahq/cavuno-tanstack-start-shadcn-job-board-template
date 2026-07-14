// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/auth', () => ({
  consumeMagicLink: vi.fn(),
  exchangeOAuth: vi.fn(),
}));

import { Route as MagicLinkRoute } from './auth.magic-link';
import { Route as OAuthCompleteRoute } from './auth.oauth-complete';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function validateSearch(
  route: typeof MagicLinkRoute | typeof OAuthCompleteRoute,
  search: Record<string, unknown>,
) {
  const validate = route.options.validateSearch;
  if (typeof validate !== 'function') {
    throw new Error(
      'The auth callback route must validate its search parameters',
    );
  }
  return validate(search);
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
  ] as const)('keeps returnTo on the %s recovery link', (_name, route) => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    vi.spyOn(route, 'useLoaderData').mockReturnValue({
      status: 'invalid',
    } as never);
    vi.spyOn(route, 'useSearch').mockReturnValue({
      token: 'one-time-token',
      returnTo,
    });
    const Component = route.options.component;
    if (!Component)
      throw new Error('The auth callback route needs a component');

    render(<Component />);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });
});
