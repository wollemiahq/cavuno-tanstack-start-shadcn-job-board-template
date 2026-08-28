// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { isRedirect } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendAuthIntentQuery,
  appendOAuthProviderHint,
} from '@/lib/board-datalayer-events';
import { candidateOAuthReturnTo } from '@/lib/candidate-return-to';

import { loadOAuthComplete } from './-auth.oauth-complete';

const mocks = {
  exchangeOAuth: vi.fn(),
  getSeoBase: vi.fn().mockResolvedValue({
    boardName: 'Acme Board',
    language: 'en',
    origin: 'https://board.example',
  }),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('/auth/oauth-complete loader', () => {
  it('redirects returning users to login even from a sign-up OAuth start', async () => {
    const returnTo = candidateOAuthReturnTo('/account', 'sign_up', 'google');
    mocks.exchangeOAuth.mockResolvedValue({ ok: true, isNewUser: false });
    let result: unknown;
    try {
      await loadOAuthComplete(
        { token: 'oauth-token', returnTo },
        mocks,
      );
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/account?cavuno_auth=login&cavuno_auth_method=google',
    );
  });

  it('redirects new users to sign_up even when sign-in intent was staged', async () => {
    const returnTo = appendOAuthProviderHint(
      appendAuthIntentQuery('/jobs?q=design', 'login'),
      'linkedin',
    );
    mocks.exchangeOAuth.mockResolvedValue({ ok: true, isNewUser: true });
    let result: unknown;
    try {
      await loadOAuthComplete(
        { token: 'oauth-token', returnTo },
        mocks,
      );
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/jobs?q=design&cavuno_auth=sign_up&cavuno_auth_method=linkedin',
    );
  });
});
