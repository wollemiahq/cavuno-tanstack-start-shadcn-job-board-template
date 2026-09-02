// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UrlSearchInput } from '../lib/pagination';

const mocks = {
  assignLocation: vi.fn(),
  getOAuthAuthorizationUrl: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(),
  requestMagicLink: vi.fn(),
  signIn: vi.fn(),
};

import { SignInView } from './-auth.sign-in';
import { Route } from './auth.sign-in';

import { appendAuthConversionQuery } from '@/lib/board-datalayer-events';
import { candidateOAuthReturnTo } from '@/lib/candidate-return-to';

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
  const stubs = [
    '/auth/sign-in',
    '/auth/forgot-password',
    '/auth/join',
    '/auth/sign-up',
  ].map((path) =>
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

function validateSearch(search: UrlSearchInput) {
  const validate = Route.options.validateSearch;
  if (!validate) {
    throw new Error('The sign-in route must validate its search parameters');
  }
  if ('parse' in validate) return validate.parse(search);
  if ('~standard' in validate) {
    throw new Error('The sign-in route uses an unexpected async schema');
  }
  return validate(search);
}

function renderSignIn(
  returnTo: string,
  notice?: Parameters<typeof SignInView>[0]['notice'],
) {
  return renderRouted(
    <SignInView
      returnTo={returnTo}
      notice={notice}
      signInAction={mocks.signIn}
      requestMagicLinkAction={mocks.requestMagicLink}
      getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
      invalidate={mocks.invalidate}
      navigate={mocks.navigate}
      assignLocation={mocks.assignLocation}
    />,
  );
}

describe('/auth/sign-in search contract', () => {
  it('trusts a complete internal candidate destination', async () => {
    expect(
      validateSearch({
        returnTo: '/companies/acme/jobs/platform-engineer?q=robotics#apply',
      }),
    ).toEqual({
      returnTo: '/companies/acme/jobs/platform-engineer?q=robotics#apply',
    });
  });

  it('preserves only the bounded password-reset marker and renders its durable status', async () => {
    expect(
      validateSearch({
        returnTo: '/account',
        reset: 'password',
      }),
    ).toEqual({ returnTo: '/account', reset: 'password' });
    expect(validateSearch({ reset: 'unexpected' })).toEqual({});

    renderSignIn('/account', 'password-reset');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your password was updated. Sign in with your new password.',
    );
  });

  it('returns a password sign-in to the validated destination', async () => {
    const returnTo =
      '/companies/acme/jobs/platform-engineer?source=search#apply';
    mocks.signIn.mockResolvedValue({ ok: true });
    mocks.invalidate.mockRejectedValue(new Error('refresh unavailable'));
    const { container } = renderSignIn(returnTo);
    await screen.findByRole('button', { name: 'Sign in' });
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'secret-password' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.assignLocation).toHaveBeenCalledWith(
        appendAuthConversionQuery(returnTo, 'login', 'password'),
      );
    });
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('recovers when password sign-in rejects unexpectedly', async () => {
    mocks.signIn.mockRejectedValue(new Error('network unavailable'));
    const { container } = renderSignIn('/account');
    await screen.findByRole('button', { name: 'Sign in' });
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'secret-password' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('includes the validated destination in a requested magic link', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    mocks.requestMagicLink.mockResolvedValue({ ok: true });
    const { container } = renderSignIn(returnTo);
    fireEvent.click(await screen.findByRole('radio', { name: 'Magic link' }));
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Send magic link' }),
    );

    await waitFor(() => {
      expect(mocks.requestMagicLink).toHaveBeenCalledWith({
        data: { email: 'candidate@example.com', returnTo, intent: 'sign_in' },
      });
    });
  });

  it('tells an unknown email to create an account instead of minting a sign-up link', async () => {
    mocks.requestMagicLink.mockResolvedValue({
      ok: false,
      code: 'board_auth_account_not_found',
      message: 'No account exists for that email.',
    });
    const { container } = renderSignIn('/jobs');
    fireEvent.click(screen.getByRole('radio', { name: 'Magic link' }));
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'deleted@example.com' },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Send magic link' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No account exists for that email. Create an account first.',
    );
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });

  it('includes the validated destination in an OAuth request', async () => {
    const returnTo = '/companies/acme/jobs/platform-engineer?source=search';
    mocks.getOAuthAuthorizationUrl.mockResolvedValue({
      ok: false,
      message: 'OAuth unavailable in this test',
    });
    renderSignIn(returnTo);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    );

    await waitFor(() => {
      expect(mocks.getOAuthAuthorizationUrl).toHaveBeenCalledWith({
        data: {
          provider: 'google',
          returnTo: candidateOAuthReturnTo(returnTo, 'login', 'google'),
        },
      });
    });
  });

  it('recovers when an OAuth request rejects unexpectedly', async () => {
    mocks.getOAuthAuthorizationUrl.mockRejectedValue(
      new Error('network unavailable'),
    );
    renderSignIn('/account');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled();
  });

  it('keeps the destination on secondary auth links', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    renderSignIn(returnTo);

    expect(
      await screen.findByRole('link', { name: 'Forgot password?' }),
    ).toHaveAttribute(
      'href',
      `/auth/forgot-password?returnTo=${encodeURIComponent(returnTo)}`,
    );
    // Get started goes to the join gate, not straight to the candidate form —
    // the role is unknown here, so `/auth/join` resolves it. The destination
    // still has to survive the hop.
    expect(await screen.findByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      `/auth/join?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });

  it('uses native radio controls for keyboard-correct sign-in method selection', async () => {
    const { container } = renderSignIn('/account');
    const password = await screen.findByRole('radio', { name: 'Password' });
    const magic = await screen.findByRole('radio', { name: 'Magic link' });
    const nativeRadios = container.querySelectorAll('input[type="radio"]');

    expect(password).toHaveAttribute('aria-checked', 'true');
    expect(magic).toHaveAttribute('aria-checked', 'false');
    expect(nativeRadios).toHaveLength(2);
    expect(nativeRadios[0]).toHaveAttribute('name', 'sign-in-method');
    expect(nativeRadios[1]).toHaveAttribute('name', 'sign-in-method');
  });
});
