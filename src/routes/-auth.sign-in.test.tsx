// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

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

function renderSignIn(returnTo: string) {
  return render(
    <SignInView
      returnTo={returnTo}
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
  it('trusts a complete internal candidate destination', () => {
    expect(
      validateSearch({
        returnTo: '/companies/acme/jobs/platform-engineer?q=robotics#apply',
      }),
    ).toEqual({
      returnTo: '/companies/acme/jobs/platform-engineer?q=robotics#apply',
    });
  });

  it('returns a password sign-in to the validated destination', async () => {
    const returnTo =
      '/companies/acme/jobs/platform-engineer?source=search#apply';
    mocks.signIn.mockResolvedValue({ ok: true });
    const { container } = renderSignIn(returnTo);
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'secret-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.invalidate).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith(returnTo);
    });
  });

  it('recovers when password sign-in rejects unexpectedly', async () => {
    mocks.signIn.mockRejectedValue(new Error('network unavailable'));
    const { container } = renderSignIn('/account');
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'secret-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('includes the validated destination in a requested magic link', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    mocks.requestMagicLink.mockResolvedValue({ ok: true });
    const { container } = renderSignIn(returnTo);
    fireEvent.click(screen.getByRole('radio', { name: 'Magic link' }));
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Send magic link' }),
    );

    await waitFor(() => {
      expect(mocks.requestMagicLink).toHaveBeenCalledWith({
        data: { email: 'candidate@example.com', returnTo },
      });
    });
  });

  it('includes the validated destination in an OAuth request', async () => {
    const returnTo = '/companies/acme/jobs/platform-engineer?source=search';
    mocks.getOAuthAuthorizationUrl.mockResolvedValue({
      ok: false,
      message: 'OAuth unavailable in this test',
    });
    renderSignIn(returnTo);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );

    await waitFor(() => {
      expect(mocks.getOAuthAuthorizationUrl).toHaveBeenCalledWith({
        data: { provider: 'google', returnTo },
      });
    });
  });

  it('recovers when an OAuth request rejects unexpectedly', async () => {
    mocks.getOAuthAuthorizationUrl.mockRejectedValue(
      new Error('network unavailable'),
    );
    renderSignIn('/account');
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled();
  });

  it('keeps the destination on secondary auth links', () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    renderSignIn(returnTo);

    expect(
      screen.getByRole('link', { name: 'Forgot password?' }),
    ).toHaveAttribute(
      'href',
      `/auth/forgot-password?returnTo=${encodeURIComponent(returnTo)}`,
    );
    // Get started goes to the join gate, not straight to the candidate form —
    // the role is unknown here, so `/auth/join` resolves it. The destination
    // still has to survive the hop.
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      `/auth/join?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });

  it('uses native radio controls for keyboard-correct sign-in method selection', () => {
    const { container } = renderSignIn('/account');
    const password = screen.getByRole('radio', { name: 'Password' });
    const magic = screen.getByRole('radio', { name: 'Magic link' });
    const nativeRadios = container.querySelectorAll('input[type="radio"]');

    expect(password).toHaveAttribute('aria-checked', 'true');
    expect(magic).toHaveAttribute('aria-checked', 'false');
    expect(nativeRadios).toHaveLength(2);
    expect(nativeRadios[0]).toHaveAttribute('name', 'sign-in-method');
    expect(nativeRadios[1]).toHaveAttribute('name', 'sign-in-method');
  });
});
