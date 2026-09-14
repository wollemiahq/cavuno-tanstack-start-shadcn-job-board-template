// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isRedirect,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = {
  getSeoBase: vi.fn().mockResolvedValue({
    boardName: 'Acme Board',
    language: 'en',
    origin: 'https://board.example',
  }),
  verifyEmail: vi.fn(),
  getSessionUser: vi.fn(),
};

import { loadVerifyEmail, VerifyEmailView } from './-auth.verify-email';
import { Route } from './auth.verify-email';

import { m } from '@/paraglide/messages';

function verifyEmailLoader(token: string, returnTo: string) {
  return loadVerifyEmail(
    { token, returnTo },
    {
      getSeoBase: mocks.getSeoBase,
      getSessionUserStrict: mocks.getSessionUser,
      verifyEmail: mocks.verifyEmail,
    },
  );
}

async function loadVerifyEmailOrRedirect(token: string, returnTo: string) {
  try {
    return await verifyEmailLoader(token, returnTo);
  } catch (error) {
    return error;
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function renderRouted(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const stubs = ['/auth/sign-in', '/jobs', '/account'].map((path) =>
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

describe('/auth/verify-email search contract', () => {
  it('maps a rejecting loader to the invalid card instead of throwing', async () => {
    mocks.verifyEmail.mockRejectedValue(new Error('token consumed'));
    const result = await verifyEmailLoader('tok', '/account');
    expect(result).toMatchObject({ status: 'invalid', returnTo: '/account' });
  });

  it('validates a supplied candidate destination with the token', async () => {
    const validate = Route.options.validateSearch;
    if (!validate) {
      throw new Error('The email verification route must validate search');
    }
    if ('parse' in validate) {
      expect(
        validate.parse({
          token: 'one-time-token',
          returnTo: '/jobs?q=design&selectedJob=product-designer',
        }),
      ).toEqual({
        token: 'one-time-token',
        returnTo: '/jobs?q=design&selectedJob=product-designer',
      });
      return;
    }
    if ('~standard' in validate) {
      throw new Error('The email verification route uses an unexpected schema');
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

  it('sends a verified candidate to the resume offer with the job returnTo', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser
      .mockResolvedValueOnce({
        id: 'candidate-1',
        role: 'candidate',
        emailVerified: false,
      })
      .mockResolvedValueOnce({
        id: 'candidate-1',
        role: 'candidate',
        emailVerified: true,
      });

    const result = await loadVerifyEmailOrRedirect('one-time-token', returnTo);

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/auth/verify-email-required?returnTo=%2Fjobs%3Fq%3Ddesign%26selectedJob%3Dproduct-designer',
    );
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

    const result = await loadVerifyEmailOrRedirect(
      'one-time-token',
      '/jobs?q=design',
    );

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe('/employers/dashboard');
  });

  it('keeps the safe candidate fallback for anonymous verification', async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser.mockResolvedValue(null);

    const result = await loadVerifyEmailOrRedirect(
      'one-time-token',
      'https://attacker.example/phish',
    );

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/auth/verify-email-required?returnTo=%2Faccount',
    );
  });

  it('does not infer the token subject from an unrelated verified session', async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: true });
    mocks.getSessionUser.mockResolvedValue({
      id: 'other-employer',
      role: 'employer',
      emailVerified: true,
    });

    const result = await loadVerifyEmailOrRedirect(
      'candidate-token',
      '/account',
    );

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/auth/verify-email-required?returnTo=%2Faccount',
    );
    expect(mocks.getSessionUser).toHaveBeenCalledOnce();
  });

  it('sends an already-verified session through the resume offer when the link is spent', async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: false });
    mocks.getSessionUser.mockResolvedValue({
      id: 'candidate-1',
      role: 'candidate',
      emailVerified: true,
    });

    const result = await loadVerifyEmailOrRedirect('spent-token', '/account');

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/auth/verify-email-required?returnTo=%2Faccount',
    );
  });

  it('does not send a verified employer through a spent candidate link', async () => {
    mocks.verifyEmail.mockResolvedValue({ ok: false });
    mocks.getSessionUser.mockResolvedValue({
      id: 'employer-1',
      role: 'employer',
      emailVerified: true,
    });

    await expect(
      verifyEmailLoader('spent-token', '/account'),
    ).resolves.toMatchObject({
      status: 'invalid',
      returnTo: '/account',
    });
  });

  it('still shows the missing-token card when SEO context throws', async () => {
    mocks.getSeoBase.mockRejectedValue(new Error('seo unavailable'));
    await expect(verifyEmailLoader('', '/account')).resolves.toMatchObject({
      status: 'missing-token',
    });
  });

  it('still verifies a valid token when the session profile probe throws', async () => {
    mocks.getSessionUser.mockRejectedValue(new Error('profile unavailable'));
    mocks.verifyEmail.mockResolvedValue({ ok: true });

    const result = await loadVerifyEmailOrRedirect(
      'one-time-token',
      '/account',
    );

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/auth/verify-email-required?returnTo=%2Faccount',
    );
    expect(mocks.verifyEmail).toHaveBeenCalledOnce();
  });

  it('renders the invalid card, not the route error title, when the token is spent without a session', async () => {
    renderRouted(<VerifyEmailView status="invalid" returnTo="/account" />);
    expect(
      await screen.findByRole('link', {
        name: m.authVerifyEmail_signInLabel(),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Something went wrong' }),
    ).not.toBeInTheDocument();
  });
});
