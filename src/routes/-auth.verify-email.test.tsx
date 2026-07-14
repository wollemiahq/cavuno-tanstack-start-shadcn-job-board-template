// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/auth', () => ({ verifyEmail: vi.fn() }));

import { Route } from './auth.verify-email';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('/auth/verify-email search contract', () => {
  it('validates a supplied candidate destination with the token', () => {
    const validate = Route.options.validateSearch;
    if (typeof validate !== 'function') {
      throw new Error('The email verification route must validate search');
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

  it('offers the validated destination after successful verification', () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      token: 'one-time-token',
      returnTo,
    });
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({ status: 'verified' });
    const VerifyEmailPage = Route.options.component;
    if (!VerifyEmailPage)
      throw new Error('The verification route needs a component');

    render(<VerifyEmailPage />);

    expect(
      screen.getByRole('link', { name: 'Go to my account' }),
    ).toHaveAttribute('href', returnTo);
  });
});
