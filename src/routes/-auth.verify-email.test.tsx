// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/queries', () => ({ getSeoBase: vi.fn() }));

const mocks = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
  getSessionUser: vi.fn(),
}));

vi.mock('../server/auth', () => ({ verifyEmail: mocks.verifyEmail }));
vi.mock('../server/account', () => ({
  getSessionUserStrict: mocks.getSessionUser,
}));

import { Route } from './auth.verify-email';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('/auth/verify-email search contract', () => {
  it('validates a supplied candidate destination with the token', () => {
    const validate = Route.options.validateSearch;
    if (typeof validate !== 'function') {
      throw new Error('The email verification route must validate search');
    }

    expect(
      validate({
        token: 'one-time-token',
        returnTo: '/jobs?q=design&selectedJob=product-designer',
      }),
    ).toEqual({
      token: 'one-time-token',
      returnTo: '/jobs?q=design&selectedJob=product-designer',
    });
  });

  it('offers the validated destination after successful verification', () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      token: 'one-time-token',
      returnTo,
    });
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      status: 'verified',
      returnTo,
    });
    const VerifyEmailPage = Route.options.component;
    if (!VerifyEmailPage)
      throw new Error('The verification route needs a component');

    render(<VerifyEmailPage />);

    expect(
      screen.getByRole('link', { name: 'Go to my account' }),
    ).toHaveAttribute('href', returnTo);
  });

  it('uses same-browser employer session truth after consuming the token', async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser
      .mockResolvedValueOnce({
        id: 'employer-1',
        role: 'employer',
        emailVerified: false,
      })
      .mockResolvedValueOnce({
        id: 'employer-1',
        role: 'employer',
        emailVerified: true,
      });
    const loader = Route.options.loader;
    if (typeof loader !== 'function') {
      throw new Error('The email verification route must have a loader');
    }

    await expect(
      loader({
        deps: {
          token: 'one-time-token',
          returnTo: '/jobs?q=design',
        },
      } as never),
    ).resolves.toMatchObject({
      status: 'verified',
      returnTo: '/employers/dashboard',
    });
  });

  it('keeps the safe candidate fallback for anonymous verification', async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser.mockResolvedValue(null);
    const loader = Route.options.loader;
    if (typeof loader !== 'function') {
      throw new Error('The email verification route must have a loader');
    }

    await expect(
      loader({
        deps: {
          token: 'one-time-token',
          returnTo: 'https://attacker.example/phish',
        },
      } as never),
    ).resolves.toMatchObject({
      status: 'verified',
      returnTo: '/account',
    });
  });

  it('does not infer the token subject from an unrelated verified session', async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser.mockResolvedValue({
      id: 'other-employer',
      role: 'employer',
      emailVerified: true,
    });
    const loader = Route.options.loader;
    if (typeof loader !== 'function') {
      throw new Error('The email verification route must have a loader');
    }

    await expect(
      loader({
        deps: {
          token: 'candidate-token',
          returnTo: '/account',
        },
      } as never),
    ).resolves.toMatchObject({
      status: 'verified',
      returnTo: '/account',
    });
    expect(mocks.getSessionUser).toHaveBeenCalledOnce();
  });

  it('does not consume a one-time token when the session profile is unavailable', async () => {
    mocks.getSessionUser.mockRejectedValue(new Error('profile unavailable'));
    const loader = Route.options.loader;
    if (typeof loader !== 'function') {
      throw new Error('The email verification route must have a loader');
    }

    await expect(
      loader({
        deps: {
          token: 'one-time-token',
          returnTo: '/account',
        },
      } as never),
    ).rejects.toThrow('profile unavailable');
    expect(mocks.verifyEmail).not.toHaveBeenCalled();
  });
});
