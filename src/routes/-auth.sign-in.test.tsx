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
  getSsoAuthorizationUrl: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(),
  requestMagicLink: vi.fn(),
  signIn: vi.fn(),
};

import { SignInView } from './-auth.sign-in';
import { Route } from './auth.sign-in';

import {
  appendAuthConversionQuery,
  appendAuthIntentQuery,
} from '@/lib/board-datalayer-events';
import { candidateOAuthReturnTo } from '@/lib/candidate-return-to';
import { m } from '@/paraglide/messages';
import type { BoardRoleSignIn, PublicBoardSignIn } from '@cavuno/board';

afterEach(() => {
  // The HTML fallback must keep credentials and personal data out of GET URLs.
  for (const input of document.querySelectorAll<HTMLInputElement>(
    'input[type="password"], input[autocomplete="one-time-code"], input[type="email"], textarea[name="coverLetter"]',
  )) {
    expect(input.form?.method).toBe('post');
  }
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
      getSsoAuthorizationUrlAction={mocks.getSsoAuthorizationUrl}
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
    expect(
      await screen.findByRole('button', { name: 'Sign in' }),
    ).toBeEnabled();
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
    fireEvent.click(await screen.findByRole('radio', { name: 'Magic link' }));
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
    expect(
      await screen.findByRole('link', { name: 'Get started' }),
    ).toHaveAttribute(
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

function passwordInput() {
  return document.querySelector('input[name="password"]');
}

function roleSignIn(overrides: Partial<BoardRoleSignIn> = {}): BoardRoleSignIn {
  return {
    methods: { password: true, magicLink: true, google: true, linkedin: true },
    ssoConnections: [],
    ...overrides,
  };
}

const memberSso = {
  id: 'conn_members',
  label: 'Test Members',
  logoUrl: null,
};
const staffSso = {
  id: 'conn_staff',
  label: 'Test Staff',
  logoUrl: null,
};
const NO_BUILT_INS = {
  password: false,
  magicLink: false,
  google: false,
  linkedin: false,
};

function renderSignInWith(
  returnTo: string,
  signIn: PublicBoardSignIn,
  redirectError?: string,
) {
  return renderRouted(
    <SignInView
      returnTo={returnTo}
      signIn={signIn}
      redirectError={redirectError}
      signInAction={mocks.signIn}
      requestMagicLinkAction={mocks.requestMagicLink}
      getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
      getSsoAuthorizationUrlAction={mocks.getSsoAuthorizationUrl}
      invalidate={mocks.invalidate}
      navigate={mocks.navigate}
      assignLocation={mocks.assignLocation}
    />,
  );
}

function continueWith(label: string) {
  return m.authSso_continueWithLabel({ label });
}

describe('/auth/sign-in board SSO', () => {
  it('starts sign-in through a connection for the page role', async () => {
    const returnTo = '/jobs?q=design';
    mocks.getSsoAuthorizationUrl.mockResolvedValue({
      ok: true,
      authorizeUrl: 'https://idp.example/authorize?state=abc',
    });
    renderSignInWith(returnTo, {
      candidate: roleSignIn({ ssoConnections: [memberSso] }),
      employer: roleSignIn(),
    });

    fireEvent.click(
      await screen.findByRole('button', { name: continueWith('Test Members') }),
    );

    await waitFor(() => {
      expect(mocks.assignLocation).toHaveBeenCalledWith(
        'https://idp.example/authorize?state=abc',
      );
    });
    expect(mocks.getSsoAuthorizationUrl).toHaveBeenCalledWith({
      data: {
        connectionId: 'conn_members',
        role: 'candidate',
        returnTo: appendAuthIntentQuery(returnTo, 'login'),
      },
    });
    // Built-ins the board keeps on stay next to the connection.
    expect(passwordInput()).toBeInTheDocument();
  });

  it('offers only the built-in methods the board enables for the role', async () => {
    renderSignInWith('/account', {
      candidate: roleSignIn({
        methods: {
          password: true,
          magicLink: false,
          google: false,
          linkedin: true,
        },
      }),
      employer: roleSignIn(),
    });

    await waitFor(() => {
      expect(passwordInput()).toBeInTheDocument();
    });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue with LinkedIn' }),
    ).toBeInTheDocument();
  });

  it('shows only SSO when every built-in method is off for the role', async () => {
    renderSignInWith('/account', {
      candidate: roleSignIn({
        methods: NO_BUILT_INS,
        ssoConnections: [memberSso],
      }),
      employer: roleSignIn(),
    });

    expect(
      await screen.findByRole('button', { name: continueWith('Test Members') }),
    ).toBeInTheDocument();
    expect(screen.getByText(m.authSso_onlyText())).toBeInTheDocument();
    expect(
      document.querySelector('input[name="email"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: m.authSso_signInAnotherWayLabel(),
      }),
    ).not.toBeInTheDocument();
  });

  it('uses the employer options when an employer page sent the visitor here', async () => {
    renderSignInWith('/employers/dashboard', {
      candidate: roleSignIn({ ssoConnections: [memberSso] }),
      employer: roleSignIn({ ssoConnections: [staffSso] }),
    });

    expect(
      await screen.findByRole('button', { name: continueWith('Test Staff') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: continueWith('Test Members') }),
    ).not.toBeInTheDocument();
  });

  it('swaps a refused password sign-in for the methods the API names', async () => {
    mocks.signIn.mockResolvedValue({
      ok: false,
      code: 'board_auth_method_unavailable',
      message: 'That sign-in method is switched off for this account.',
      availableMethods: {
        methods: ['google'],
        ssoConnectionIds: ['conn_staff'],
      },
    });
    mocks.getSsoAuthorizationUrl.mockResolvedValue({
      ok: false,
      message: 'SSO unavailable in this test',
    });
    const { container } = renderSignInWith('/account', {
      candidate: roleSignIn(),
      employer: roleSignIn({
        methods: { ...NO_BUILT_INS, google: true },
        ssoConnections: [staffSso],
      }),
    });
    await screen.findByRole('button', { name: 'Sign in' });
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'staff@example.com' },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'secret-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    fireEvent.click(
      await screen.findByRole('button', { name: continueWith('Test Staff') }),
    );
    expect(passwordInput()).not.toBeInTheDocument();
    expect(
      screen.getByText(m.authSignInError_methodUnavailableText()),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue with LinkedIn' }),
    ).not.toBeInTheDocument();
    // The connection is the employer's, so SSO starts as an employer.
    await waitFor(() => {
      expect(mocks.getSsoAuthorizationUrl).toHaveBeenCalledWith({
        data: expect.objectContaining({
          connectionId: 'conn_staff',
          role: 'employer',
        }),
      });
    });

    fireEvent.click(
      screen.getByRole('button', { name: m.authSso_signInAnotherWayLabel() }),
    );
    await waitFor(() => {
      expect(passwordInput()).toBeInTheDocument();
    });
  });

  it('accepts only code-shaped redirect errors and explains them', async () => {
    expect(validateSearch({ error: 'sso_not_provisioned' })).toEqual({
      error: 'sso_not_provisioned',
    });
    expect(validateSearch({ error: '<b>Call us</b>' })).toEqual({});

    renderSignInWith(
      '/account',
      { candidate: roleSignIn(), employer: roleSignIn() },
      'sso_not_provisioned',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.authSignInError_notProvisionedText(),
    );
  });

  it('explains a method_unavailable redirect above the role options', async () => {
    renderSignInWith(
      '/account',
      {
        candidate: roleSignIn({
          methods: NO_BUILT_INS,
          ssoConnections: [memberSso],
        }),
        employer: roleSignIn(),
      },
      'method_unavailable',
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.authSignInError_methodUnavailableText(),
    );
    expect(
      screen.getByRole('button', { name: continueWith('Test Members') }),
    ).toBeInTheDocument();
    expect(passwordInput()).not.toBeInTheDocument();
  });
});
