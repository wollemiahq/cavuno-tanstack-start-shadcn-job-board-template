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
import { renderRouted } from '@/test/render-routed';

const mocks = {
  getBoardContext: vi.fn(),
  getOAuthAuthorizationUrl: vi.fn(),
  getSessionUser: vi.fn(),
  invalidate: vi.fn(),
  signUpEmployer: vi.fn(),
};

afterEach(() => {
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
        invalidate={mocks.invalidate}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await screen.findByRole('alert');
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with LinkedIn' }),
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

    const action = await screen.findByRole('link', {
      name: 'Go to employer dashboard',
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
