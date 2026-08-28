// @vitest-environment jsdom

import { describe, expect, it, afterEach } from 'vitest';

import {
  appendAuthConversionQuery,
  appendAuthIntentQuery,
  appendOAuthProviderHint,
  parseAuthConversionSearchParams,
  pushBoardDataLayerEvent,
  resolvePostAuthConversionRedirect,
  stripAuthConversionSearchParams,
} from '@/lib/board-datalayer-events';

describe('board-datalayer-events', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'dataLayer');
  });

  it('pushes standard events to window.dataLayer', () => {
    window.dataLayer = [] as unknown as NonNullable<typeof window.dataLayer>;
    const pushes = window.dataLayer as { event: string; method: string; board_slug: string }[];

    pushBoardDataLayerEvent({
      event: 'sign_up',
      method: 'password',
      board_slug: 'acme',
    });

    expect(pushes).toEqual([
      { event: 'sign_up', method: 'password', board_slug: 'acme' },
    ]);
  });

  it('round-trips auth conversion query params', () => {
    const href = appendAuthConversionQuery('/account', 'login', 'google');
    expect(href).toBe('/account?cavuno_auth=login&cavuno_auth_method=google');
    expect(parseAuthConversionSearchParams(new URL(href, 'https://x.test').searchParams)).toEqual({
      event: 'login',
      method: 'google',
    });
  });

  it('maps OAuth completion from server isNewUser, not staged page intent', () => {
    const returnTo = appendOAuthProviderHint(
      appendAuthIntentQuery('/jobs?q=design', 'sign_up'),
      'linkedin',
    );
    expect(
      resolvePostAuthConversionRedirect(returnTo, {
        isNewUser: false,
        fallbackMethod: 'google',
      }),
    ).toBe('/jobs?q=design&cavuno_auth=login&cavuno_auth_method=linkedin');
    expect(
      resolvePostAuthConversionRedirect(returnTo, {
        isNewUser: true,
        fallbackMethod: 'google',
      }),
    ).toBe('/jobs?q=design&cavuno_auth=sign_up&cavuno_auth_method=linkedin');
  });

  it('defaults OAuth completion to login for returning users without sign_up intent', () => {
    expect(
      resolvePostAuthConversionRedirect(
        appendOAuthProviderHint('/account', 'google'),
        { isNewUser: false, fallbackMethod: 'google' },
      ),
    ).toBe('/account?cavuno_auth=login&cavuno_auth_method=google');
  });

  it('fires sign_up for new users even when sign-in intent was staged', () => {
    expect(
      resolvePostAuthConversionRedirect(
        appendAuthIntentQuery(
          appendOAuthProviderHint('/account', 'google'),
          'login',
        ),
        { isNewUser: true, fallbackMethod: 'google' },
      ),
    ).toBe('/account?cavuno_auth=sign_up&cavuno_auth_method=google');
  });

  it('strips auth conversion params from search', () => {
    const search = new URLSearchParams(
      'cavuno_auth=sign_up&cavuno_auth_method=password&returnTo=%2Faccount',
    );
    expect(stripAuthConversionSearchParams(search)).toBe('?returnTo=%2Faccount');
  });

  it('preserves unrelated params when appending intent', () => {
    expect(appendAuthIntentQuery('/account?tab=alerts', 'login')).toBe(
      '/account?tab=alerts&cavuno_auth_intent=login',
    );
  });
});
