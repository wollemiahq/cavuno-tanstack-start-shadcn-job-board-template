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

vi.mock('../server/queries', () => ({ getSeoBase: vi.fn() }));

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useRouter: () => ({ invalidate: mocks.invalidate }) };
});

vi.mock('../server/auth', () => ({ resetPassword: mocks.resetPassword }));

import { Route } from './auth.reset-password';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function validateSearch(search: Record<string, unknown>) {
  const validate = Route.options.validateSearch;
  if (typeof validate !== 'function') {
    throw new Error(
      'The reset-password route must validate its search parameters',
    );
  }
  return validate(search);
}

describe('/auth/reset-password continuation', () => {
  it('retains a safe candidate destination with the reset token', () => {
    expect(
      validateSearch({
        token: 'reset-token',
        returnTo: '/jobs?q=design&selectedJob=product-designer',
      }),
    ).toEqual({
      token: 'reset-token',
      returnTo: '/jobs?q=design&selectedJob=product-designer',
    });
  });

  it('keeps the destination when requesting a replacement reset link', () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      token: undefined,
      returnTo,
    });
    const ResetPasswordPage = Route.options.component;
    if (!ResetPasswordPage)
      throw new Error('The reset-password route needs a component');

    render(<ResetPasswordPage />);

    expect(
      screen.getByRole('link', { name: 'Request a new link' }),
    ).toHaveAttribute(
      'href',
      `/auth/forgot-password?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });

  it('keeps the destination on sign-in after a successful reset', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      token: 'reset-token',
      returnTo,
    });
    mocks.resetPassword.mockResolvedValue({ ok: true });
    const ResetPasswordPage = Route.options.component;
    if (!ResetPasswordPage)
      throw new Error('The reset-password route needs a component');

    const { container } = render(<ResetPasswordPage />);
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'strong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
        'href',
        `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
      );
    });
  });

  it('recovers when the password update rejects unexpectedly', async () => {
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      token: 'reset-token',
      returnTo: '/account',
    });
    mocks.resetPassword.mockRejectedValue(new Error('network unavailable'));
    const ResetPasswordPage = Route.options.component;
    if (!ResetPasswordPage)
      throw new Error('The reset-password route needs a component');

    const { container } = render(<ResetPasswordPage />);
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'strong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(
      screen.getByRole('button', { name: 'Update password' }),
    ).toBeEnabled();
  });
});
