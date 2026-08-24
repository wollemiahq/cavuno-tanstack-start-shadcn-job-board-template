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
  invalidate: vi.fn(),
  resetPassword: vi.fn(),
};

import { ResetPasswordView } from './-auth.reset-password';
import { Route } from './auth.reset-password';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function validateSearch(search: UrlSearchInput) {
  const validate = Route.options.validateSearch;
  if (!validate) {
    throw new Error(
      'The reset-password route must validate its search parameters',
    );
  }
  if ('parse' in validate) return validate.parse(search);
  if ('~standard' in validate) {
    throw new Error('The reset-password route uses an unexpected async schema');
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
    render(
      <ResetPasswordView
        token={undefined}
        returnTo={returnTo}
        resetPasswordAction={mocks.resetPassword}
        invalidate={mocks.invalidate}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Request a new link' }),
    ).toHaveAttribute(
      'href',
      `/auth/forgot-password?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });

  it('keeps the destination on sign-in after a successful reset', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    mocks.resetPassword.mockResolvedValue({ ok: true });
    const { container } = render(
      <ResetPasswordView
        token="reset-token"
        returnTo={returnTo}
        resetPasswordAction={mocks.resetPassword}
        invalidate={mocks.invalidate}
      />,
    );
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
    mocks.resetPassword.mockRejectedValue(new Error('network unavailable'));
    const { container } = render(
      <ResetPasswordView
        token="reset-token"
        returnTo="/account"
        resetPasswordAction={mocks.resetPassword}
        invalidate={mocks.invalidate}
      />,
    );
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
