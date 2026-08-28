// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { isRedirect } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadMagicLink } from './-auth.magic-link';

import { appendAuthIntentQuery } from '@/lib/board-datalayer-events';

const mocks = {
  consumeMagicLink: vi.fn(),
  getSeoBase: vi.fn().mockResolvedValue({
    boardName: 'Acme Board',
    language: 'en',
    origin: 'https://board.example',
  }),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('/auth/magic-link loader', () => {
  it('redirects returning magic-link users to login', async () => {
    mocks.consumeMagicLink.mockResolvedValue({ ok: true, isNewUser: false });
    let result: unknown;
    try {
      await loadMagicLink(
        {
          token: 'magic-token',
          returnTo: appendAuthIntentQuery('/account', 'sign_up'),
        },
        mocks,
      );
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/account?cavuno_auth=login&cavuno_auth_method=magic_link',
    );
  });

  it('redirects new magic-link users to sign_up', async () => {
    mocks.consumeMagicLink.mockResolvedValue({ ok: true, isNewUser: true });
    let result: unknown;
    try {
      await loadMagicLink(
        {
          token: 'magic-token',
          returnTo: appendAuthIntentQuery('/account', 'login'),
        },
        mocks,
      );
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/account?cavuno_auth=sign_up&cavuno_auth_method=magic_link',
    );
  });
});
