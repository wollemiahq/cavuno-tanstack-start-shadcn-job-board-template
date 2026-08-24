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

const forgotPassword = vi.fn();

import { ForgotPasswordView } from './-auth.forgot-password';
import { Route } from './auth.forgot-password';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function validateSearch(search: UrlSearchInput) {
  const validate = Route.options.validateSearch;
  if (!validate) {
    throw new Error(
      'The forgot-password route must validate its search parameters',
    );
  }
  if ('parse' in validate) return validate.parse(search);
  if ('~standard' in validate) {
    throw new Error(
      'The forgot-password route uses an unexpected async schema',
    );
  }
  return validate(search);
}

describe('/auth/forgot-password continuation', () => {
  it('sanitizes and retains an internal candidate destination', () => {
    expect(
      validateSearch({
        returnTo: '/jobs?q=design&selectedJob=product-designer',
      }),
    ).toEqual({
      returnTo: '/jobs?q=design&selectedJob=product-designer',
    });
    expect(validateSearch({ returnTo: 'https://attacker.example' })).toEqual({
      returnTo: '/account',
    });
  });

  it('keeps the destination on the confirmation link back to sign in', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    forgotPassword.mockResolvedValue({ ok: true });
    const { container } = render(
      <ForgotPasswordView
        returnTo={returnTo}
        forgotPasswordAction={forgotPassword}
      />,
    );
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Back to sign in' }),
      ).toHaveAttribute(
        'href',
        `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
      );
    });
  });

  it('recovers when the reset-link request rejects unexpectedly', async () => {
    forgotPassword.mockRejectedValue(new Error('network unavailable'));
    const { container } = render(
      <ForgotPasswordView
        returnTo="/account"
        forgotPasswordAction={forgotPassword}
      />,
    );
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(
      screen.getByRole('button', { name: 'Send reset link' }),
    ).toBeEnabled();
  });
});
