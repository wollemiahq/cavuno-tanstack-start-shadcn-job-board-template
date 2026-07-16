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

const mocks = vi.hoisted(() => ({
  getOAuthAuthorizationUrl: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(),
  requestMagicLink: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: () => ({
      invalidate: mocks.invalidate,
      navigate: mocks.navigate,
    }),
  };
});

vi.mock('../server/auth', () => ({
  getOAuthAuthorizationUrl: mocks.getOAuthAuthorizationUrl,
  requestMagicLink: mocks.requestMagicLink,
  signIn: mocks.signIn,
}));

import { Route } from './auth.sign-in';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function validateSearch(search: Record<string, unknown>) {
  const validate = Route.options.validateSearch;
  if (typeof validate !== 'function') {
    throw new Error('The sign-in route must validate its search parameters');
  }
  return validate(search);
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
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo });
    mocks.signIn.mockResolvedValue({ ok: true });
    const SignInPage = Route.options.component;
    if (!SignInPage) throw new Error('The sign-in route needs a component');

    const { container } = render(<SignInPage />);
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'secret-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.invalidate).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith({ href: returnTo });
    });
  });

  it('recovers when password sign-in rejects unexpectedly', async () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo: '/account' });
    mocks.signIn.mockRejectedValue(new Error('network unavailable'));
    const SignInPage = Route.options.component;
    if (!SignInPage) throw new Error('The sign-in route needs a component');

    const { container } = render(<SignInPage />);
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
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo });
    mocks.requestMagicLink.mockResolvedValue({ ok: true });
    const SignInPage = Route.options.component;
    if (!SignInPage) throw new Error('The sign-in route needs a component');

    const { container } = render(<SignInPage />);
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
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo });
    mocks.getOAuthAuthorizationUrl.mockResolvedValue({
      ok: false,
      message: 'OAuth unavailable in this test',
    });
    const SignInPage = Route.options.component;
    if (!SignInPage) throw new Error('The sign-in route needs a component');

    render(<SignInPage />);
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
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo: '/account' });
    mocks.getOAuthAuthorizationUrl.mockRejectedValue(
      new Error('network unavailable'),
    );
    const SignInPage = Route.options.component;
    if (!SignInPage) throw new Error('The sign-in route needs a component');

    render(<SignInPage />);
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
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo });
    const SignInPage = Route.options.component;
    if (!SignInPage) throw new Error('The sign-in route needs a component');

    render(<SignInPage />);

    expect(
      screen.getByRole('link', { name: 'Forgot password?' }),
    ).toHaveAttribute(
      'href',
      `/auth/forgot-password?returnTo=${encodeURIComponent(returnTo)}`,
    );
    // Get started goes to the join gate, not straight to the candidate form —
    // the role is unknown here, so `/auth/join` resolves it. The destination
    // still has to survive the hop.
    expect(
      screen.getByRole('link', { name: 'Get started' }),
    ).toHaveAttribute(
      'href',
      `/auth/join?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });

  it('uses native radio controls for keyboard-correct sign-in method selection', () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({ returnTo: '/account' });
    const SignInPage = Route.options.component;
    if (!SignInPage) throw new Error('The sign-in route needs a component');

    const { container } = render(<SignInPage />);
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
