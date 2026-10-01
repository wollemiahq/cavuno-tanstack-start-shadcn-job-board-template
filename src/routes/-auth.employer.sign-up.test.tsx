// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { isRedirect } from '@tanstack/react-router';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  EmployerSignUpView,
  loadEmployerSignUp,
} from './-auth.employer.sign-up';

import { buildVerifyEmailRedirectPath } from '@/lib/candidate-return-to';
import { m } from '@/paraglide/messages';
import { renderRouted } from '@/test/render-routed';
import type { BoardRoleSignIn } from '@cavuno/board';

const mocks = {
  getBoardContext: vi.fn(),
  getOAuthAuthorizationUrl: vi.fn(),
  getSsoAuthorizationUrl: vi.fn(),
  getSessionUser: vi.fn(),
  invalidate: vi.fn(),
  signUpEmployer: vi.fn(),
};

afterEach(() => {
  // The HTML fallback must keep credentials and personal data out of GET URLs.
  for (const input of document.querySelectorAll<HTMLInputElement>(
    'input[type="password"], input[autocomplete="one-time-code"], input[type="email"], textarea[name="coverLetter"]',
  )) {
    expect(input.form?.method).toBe('post');
  }
  cleanup();
  vi.clearAllMocks();
});

describe('/auth/employer/sign-up continuation', () => {
  it('starts Google and LinkedIn as an employer, not as a candidate', async () => {
    mocks.getOAuthAuthorizationUrl.mockResolvedValue({
      ok: false,
      message: 'OAuth unavailable in this test',
    });
    await renderRouted(
      <EmployerSignUpView
        boardName="Cavuno Jobs"
        signUpEmployerAction={mocks.signUpEmployer}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        getSsoAuthorizationUrlAction={mocks.getSsoAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: m.authSignIn_continueWithGoogleLabel(),
      }),
    );
    await screen.findByRole('alert');
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authSignIn_continueWithLinkedinLabel(),
      }),
    );

    for (const [index, provider] of ['google', 'linkedin'].entries()) {
      const call = mocks.getOAuthAuthorizationUrl.mock.calls[index]?.[0];
      expect(call.data.provider).toBe(provider);
      // Without this the handshake mints a candidate who can never reach the
      // employer dashboard.
      expect(call.data.role).toBe('employer');
      const returnTo = new URL(call.data.returnTo, 'https://board.example');
      expect(returnTo.pathname).toBe('/employers/dashboard');
      expect(returnTo.searchParams.get('cavuno_auth_intent')).toBe('sign_up');
      expect(returnTo.searchParams.get('cavuno_oauth_provider')).toBe(provider);
    }
  });

  it('sends successful employer signup to the verification gate for the dashboard', async () => {
    mocks.signUpEmployer.mockResolvedValue({ ok: true });
    mocks.invalidate.mockRejectedValue(new Error('refresh unavailable'));
    await renderRouted(
      <EmployerSignUpView
        boardName="Cavuno Jobs"
        signUpEmployerAction={mocks.signUpEmployer}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        getSsoAuthorizationUrlAction={mocks.getSsoAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );
    fireEvent.change(screen.getByLabelText(m.authEmployerSignUp_nameLabel()), {
      target: { value: 'Ada Employer' },
    });
    fireEvent.change(
      screen.getByLabelText(m.authEmployerSignUp_workEmailLabel()),
      {
        target: { value: 'ada@company.example' },
      },
    );
    fireEvent.change(
      screen.getByLabelText(m.authEmployerSignUp_passwordLabel()),
      {
        target: { value: 'correct-horse' },
      },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authEmployerSignUp_submitLabel(),
      }),
    );

    const action = await screen.findByRole('link', {
      name: m.authEmployerSignUp_goToDashboardLabel(),
    });
    expect(action.getAttribute('href')).toBe(
      buildVerifyEmailRedirectPath('/employers/dashboard'),
    );
    const url = new URL(action.getAttribute('href')!, 'https://board.example');
    expect(url.pathname).toBe('/auth/verify-email-required');
    expect(url.searchParams.get('returnTo')).toBe('/employers/dashboard');
    expect(url.searchParams.get('cavuno_auth')).toBe('sign_up');
    expect(url.searchParams.get('cavuno_auth_method')).toBe('password');
  });

  it('re-enters the verification gate for an existing unverified employer session', async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: 'employer-1',
      role: 'employer',
      emailVerified: false,
    });
    mocks.getBoardContext.mockResolvedValue({
      name: 'Cavuno Jobs',
      features: { employers: true },
    });
    let result: unknown;
    try {
      await loadEmployerSignUp({
        getBoardContext: mocks.getBoardContext,
        sessionUserOrNull: mocks.getSessionUser,
      });
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe(
      '/auth/verify-email-required?returnTo=%2Femployers%2Fdashboard',
    );
  });

  it('sends an existing verified employer session to the employer dashboard', async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: 'employer-1',
      role: 'employer',
      emailVerified: true,
    });
    mocks.getBoardContext.mockResolvedValue({
      name: 'Cavuno Jobs',
      features: { employers: true },
    });
    let result: unknown;
    try {
      await loadEmployerSignUp({
        getBoardContext: mocks.getBoardContext,
        sessionUserOrNull: mocks.getSessionUser,
      });
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;
    expect(result.options.href).toBe('/employers/dashboard');
  });
});

const allBuiltIns: BoardRoleSignIn = {
  methods: { password: true, magicLink: true, google: true, linkedin: true },
  ssoConnections: [],
};
const staffSso = {
  id: 'conn_staff',
  label: 'Test Staff',
  logoUrl: null,
};

describe('/auth/employer/sign-up board SSO', () => {
  it('offers only SSO, as an employer, when every built-in method is off', async () => {
    mocks.getSsoAuthorizationUrl.mockResolvedValue({
      ok: false,
      message: 'SSO unavailable in this test',
    });
    await renderRouted(
      <EmployerSignUpView
        boardName="Cavuno Jobs"
        signIn={{
          candidate: allBuiltIns,
          employer: {
            methods: {
              password: false,
              magicLink: false,
              google: false,
              linkedin: false,
            },
            ssoConnections: [staffSso],
          },
        }}
        signUpEmployerAction={mocks.signUpEmployer}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        getSsoAuthorizationUrlAction={mocks.getSsoAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );

    expect(screen.queryByLabelText('Work email')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authSso_continueWithLabel({ label: 'Test Staff' }),
      }),
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    const call = mocks.getSsoAuthorizationUrl.mock.calls[0]?.[0];
    expect(call.data.connectionId).toBe('conn_staff');
    expect(call.data.role).toBe('employer');
    const returnTo = new URL(call.data.returnTo, 'https://board.example');
    expect(returnTo.pathname).toBe('/employers/dashboard');
    expect(returnTo.searchParams.get('cavuno_auth_intent')).toBe('sign_up');
  });

  it('swaps a refused registration for the methods the API names', async () => {
    mocks.signUpEmployer.mockResolvedValue({
      ok: false,
      code: 'board_auth_method_unavailable',
      message: 'Password sign-up is switched off for this role.',
      availableMethods: { methods: [], ssoConnectionIds: ['conn_staff'] },
    });
    await renderRouted(
      <EmployerSignUpView
        boardName="Cavuno Jobs"
        signIn={{
          candidate: allBuiltIns,
          employer: { ...allBuiltIns, ssoConnections: [staffSso] },
        }}
        signUpEmployerAction={mocks.signUpEmployer}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        getSsoAuthorizationUrlAction={mocks.getSsoAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Ada Employer' },
    });
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'ada@company.example' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Create employer account' }),
    );

    expect(
      await screen.findByText(m.authSignInError_methodUnavailableText()),
    ).toBeVisible();
    expect(screen.queryByLabelText('Work email')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: m.authSso_continueWithLabel({ label: 'Test Staff' }),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
