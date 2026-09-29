// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';

import { ssoLinkProofBindingStore } from '@cavuno/board';
import { isRedirect } from '@tanstack/react-router';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OAuthCompleteView,
  loadOAuthComplete,
  type OAuthCompleteState,
} from './-auth.oauth-complete';

import {
  appendAuthIntentQuery,
  appendOAuthProviderHint,
} from '@/lib/board-datalayer-events';
import { candidateOAuthReturnTo } from '@/lib/candidate-return-to';
import { m } from '@/paraglide/messages';
import { renderRouted } from '@/test/render-routed';

const mocks = {
  exchangeOAuth: vi.fn(),
  getSeoBase: vi.fn().mockResolvedValue({
    boardName: 'Acme Board',
    language: 'en',
    origin: 'https://board.example',
  }),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('/auth/oauth-complete loader', () => {
  it('redirects returning users to login even from a sign-up OAuth start', async () => {
    const returnTo = candidateOAuthReturnTo('/account', 'sign_up', 'google');
    mocks.exchangeOAuth.mockResolvedValue({ ok: true, isNewUser: false });
    let result: unknown;
    try {
      await loadOAuthComplete({ token: 'oauth-token', returnTo }, mocks);
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
      await loadOAuthComplete({ token: 'oauth-token', returnTo }, mocks);
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/auth/verify-email-required?returnTo=%2Fjobs%3Fq%3Ddesign&cavuno_auth=sign_up&cavuno_auth_method=linkedin',
    );
  });
});

async function loaderOutcome(deps: Parameters<typeof loadOAuthComplete>[0]) {
  try {
    return await loadOAuthComplete(deps, mocks);
  } catch (error) {
    return error;
  }
}

describe('/auth/oauth-complete SSO completions', () => {
  it('records an SSO token exchange as an sso login', async () => {
    mocks.exchangeOAuth.mockResolvedValue({ ok: true, isNewUser: false });
    const result = await loaderOutcome({
      token: 'sso-token',
      method: 'sso',
      returnTo: appendAuthIntentQuery('/account', 'login'),
    });

    expect(mocks.exchangeOAuth).toHaveBeenCalledWith({
      data: { token: 'sso-token' },
    });
    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/account?cavuno_auth=login&cavuno_auth_method=sso',
    );
  });

  it('hands the link-proof steps and redirect errors to the page', async () => {
    await expect(
      loaderOutcome({
        status: 'sso_link_proof_sent',
        linkProofBinding: 'binding-1',
        returnTo: '/account',
      }),
    ).resolves.toMatchObject({
      status: 'link-proof-sent',
      linkProofBinding: 'binding-1',
    });
    await expect(
      loaderOutcome({ linkProof: 'proof-1', returnTo: '/account' }),
    ).resolves.toMatchObject({ status: 'link-proof', linkProof: 'proof-1' });
    await expect(
      loaderOutcome({ error: 'sso_failed', returnTo: '/account' }),
    ).resolves.toMatchObject({ status: 'error', error: 'sso_failed' });
    expect(mocks.exchangeOAuth).not.toHaveBeenCalled();
  });
});

function memoryBindingStore() {
  const values = new Map<string, string>();
  return ssoLinkProofBindingStore('board_test', {
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, value),
      removeItem: (key) => void values.delete(key),
    },
  });
}

function renderCompletion(
  state: OAuthCompleteState,
  bindingStore: ReturnType<typeof memoryBindingStore>,
  consume: Parameters<typeof OAuthCompleteView>[0]['consumeSsoLinkProofAction'],
  assignLocation: (url: string) => void,
) {
  return renderRouted(
    <StrictMode>
      <OAuthCompleteView
        state={state}
        returnTo="/account"
        bindingStore={bindingStore}
        consumeSsoLinkProofAction={consume}
        assignLocation={assignLocation}
      />
    </StrictMode>,
  );
}

describe('SSO link proof', () => {
  it('keeps the binding in this browser and asks the user to check their email', async () => {
    const bindingStore = memoryBindingStore();
    await renderCompletion(
      { status: 'link-proof-sent', linkProofBinding: 'binding-1' },
      bindingStore,
      vi.fn(),
      vi.fn(),
    );

    expect(
      screen.getByRole('heading', { name: m.authSso_checkEmailTitle() }),
    ).toBeInTheDocument();
    expect(bindingStore.read()).toBe('binding-1');
  });

  it('spends the proof once with the stored binding, then signs in', async () => {
    const bindingStore = memoryBindingStore();
    bindingStore.save('binding-1');
    const consume = vi.fn().mockResolvedValue({ ok: true, isNewUser: false });
    const assignLocation = vi.fn();
    await renderCompletion(
      { status: 'link-proof', linkProof: 'proof-1' },
      bindingStore,
      consume,
      assignLocation,
    );

    await waitFor(() => {
      expect(assignLocation).toHaveBeenCalledWith(
        '/account?cavuno_auth=login&cavuno_auth_method=sso',
      );
    });
    expect(consume).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledWith({
      data: { token: 'proof-1', browserBinding: 'binding-1' },
    });
    expect(bindingStore.read()).toBeNull();
  });

  it('points a different device back to the one that started sign-in', async () => {
    const bindingStore = memoryBindingStore();
    const consume = vi.fn().mockResolvedValue({
      ok: false,
      code: 'board_auth_sso_browser_mismatch',
      message: 'Open this link in the browser where you started signing in.',
    });
    const assignLocation = vi.fn();
    await renderCompletion(
      { status: 'link-proof', linkProof: 'proof-1' },
      bindingStore,
      consume,
      assignLocation,
    );

    expect(
      await screen.findByText(m.authSso_deviceMismatchBody()),
    ).toBeVisible();
    expect(consume).toHaveBeenCalledWith({
      data: { token: 'proof-1', browserBinding: undefined },
    });
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it('explains a redirect error code', async () => {
    await renderCompletion(
      { status: 'error', error: 'sso_identity_linked_elsewhere' },
      memoryBindingStore(),
      vi.fn(),
      vi.fn(),
    );

    expect(
      screen.getByText(m.authSignInError_identityLinkedElsewhereText()),
    ).toBeInTheDocument();
  });
});
