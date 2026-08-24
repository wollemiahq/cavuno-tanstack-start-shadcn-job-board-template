// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
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
    render(
      route === MagicLinkRoute ? (
        <MagicLinkView status="invalid" returnTo={returnTo} />
      ) : (
        <OAuthCompleteView status="invalid" returnTo={returnTo} />
      ),
    );

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });
});
