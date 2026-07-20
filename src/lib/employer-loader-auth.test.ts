import { isRedirect, redirect } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  handleEmployerLoaderError,
  isReauthRetry,
} from './employer-loader-auth';

// The refresh attempt is a server function; mock it so the loader-error
// policy can be exercised as pure logic (unauthorized → refresh → redirect).
const { mockRefreshSession } = vi.hoisted(() => ({
  mockRefreshSession: vi.fn(),
}));
vi.mock('../server/auth', () => ({ refreshSession: mockRefreshSession }));

/** Run the policy and capture whatever it throws (it always throws). */
async function thrownBy(...args: Parameters<typeof handleEmployerLoaderError>) {
  try {
    await handleEmployerLoaderError(...args);
  } catch (error) {
    return error;
  }
  throw new Error('expected handleEmployerLoaderError to throw');
}

afterEach(() => {
  mockRefreshSession.mockReset();
});

describe('handleEmployerLoaderError', () => {
  it('on unauthorized: refreshes once and, on success, retries with ?reauth=1', async () => {
    mockRefreshSession.mockResolvedValue({ ok: true });

    const error = (await thrownBy(
      new Error('UNAUTHENTICATED'),
      '/employers/dashboard',
    )) as { options: { href?: string } };

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(isRedirect(error)).toBe(true);
    expect(error.options.href).toBe('/employers/dashboard?reauth=1');
  });

  it('appends the reauth marker with & when returnTo already has a query', async () => {
    mockRefreshSession.mockResolvedValue({ ok: true });

    const error = (await thrownBy(
      new Error('UNAUTHENTICATED'),
      '/employers/companies/acme/jobs?tab=open',
    )) as { options: { href?: string } };

    expect(error.options.href).toBe(
      '/employers/companies/acme/jobs?tab=open&reauth=1',
    );
  });

  it('on unauthorized with a failed refresh: falls through to sign-in with returnTo', async () => {
    mockRefreshSession.mockResolvedValue({ ok: false });

    const error = (await thrownBy(
      new Error('UNAUTHENTICATED'),
      '/employers/dashboard',
    )) as { options: { to?: string; search?: unknown } };

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(isRedirect(error)).toBe(true);
    expect(error.options.to).toBe('/auth/sign-in');
    expect(error.options.search).toEqual({ returnTo: '/employers/dashboard' });
  });

  it('when already retried (reauth=1): skips refresh and goes straight to sign-in', async () => {
    const error = (await thrownBy(
      new Error('UNAUTHENTICATED'),
      '/employers/dashboard',
      { retried: true },
    )) as { options: { to?: string; search?: unknown } };

    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(error.options.to).toBe('/auth/sign-in');
    expect(error.options.search).toEqual({ returnTo: '/employers/dashboard' });
  });

  it('treats a throwing refresh as a failed refresh (sign-in fallthrough)', async () => {
    mockRefreshSession.mockRejectedValue(new Error('network down'));

    const error = (await thrownBy(
      new Error('UNAUTHENTICATED'),
      '/employers/dashboard',
    )) as { options: { to?: string } };

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(error.options.to).toBe('/auth/sign-in');
  });

  it('re-throws an incoming redirect unchanged (no refresh, no sign-in bounce)', async () => {
    const incoming = redirect({ to: '/employers/dashboard' });

    const error = await thrownBy(incoming, '/employers/dashboard');

    expect(error).toBe(incoming);
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it('re-throws a non-auth error untouched', async () => {
    const other = new Error('database unavailable');

    const error = await thrownBy(other, '/employers/dashboard');

    expect(error).toBe(other);
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });
});

describe('isReauthRetry', () => {
  it('recognises the one-shot retry marker in any accepted form', () => {
    expect(isReauthRetry({ search: { reauth: '1' } })).toBe(true);
    expect(isReauthRetry({ search: { reauth: 1 } })).toBe(true);
    expect(isReauthRetry({ search: { reauth: true } })).toBe(true);
  });

  it('is false for a missing or absent marker', () => {
    expect(isReauthRetry({ search: { reauth: '0' } })).toBe(false);
    expect(isReauthRetry({ search: {} })).toBe(false);
    expect(isReauthRetry({})).toBe(false);
    expect(isReauthRetry(undefined)).toBe(false);
  });
});
