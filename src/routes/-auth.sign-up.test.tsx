// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = {
  getOAuthAuthorizationUrl: vi.fn(),
  invalidate: vi.fn(),
  signUp: vi.fn(),
};

import { SignUpView } from './-auth.sign-up';
import { Route } from './auth.sign-up';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('/auth/sign-up search contract', () => {
  it('validates a complete internal candidate destination', () => {
    const validate = Route.options.validateSearch;
    if (!validate) {
      throw new Error('The candidate sign-up route must validate search');
    }
    if ('parse' in validate) {
      expect(
        validate.parse({
          returnTo: '/jobs?q=design&selectedJob=product-designer',
        }),
      ).toEqual({
        returnTo: '/jobs?q=design&selectedJob=product-designer',
      });
      return;
    }
    if ('~standard' in validate) {
      throw new Error('The candidate sign-up route uses an unexpected schema');
    }

    expect(
      validate({ returnTo: '/jobs?q=design&selectedJob=product-designer' }),
    ).toEqual({
      returnTo: '/jobs?q=design&selectedJob=product-designer',
    });
  });

  it('offers the same Google and LinkedIn account entry points as sign-in', async () => {
    const returnTo = '/jobs?q=design';
    mocks.getOAuthAuthorizationUrl.mockResolvedValue({
      ok: false,
      message: 'OAuth unavailable in this test',
    });
    render(
      <SignUpView
        boardName="Cavuno Jobs"
        returnTo={returnTo}
        signUpAction={mocks.signUp}
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

    expect(mocks.getOAuthAuthorizationUrl).toHaveBeenNthCalledWith(1, {
      data: { provider: 'google', returnTo },
    });
    expect(mocks.getOAuthAuthorizationUrl).toHaveBeenNthCalledWith(2, {
      data: { provider: 'linkedin', returnTo },
    });
  });

  it('keeps the destination in the post-registration verification action', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    mocks.signUp.mockResolvedValue({ ok: true });
    render(
      <SignUpView
        boardName="Cavuno Jobs"
        returnTo={returnTo}
        signUpAction={mocks.signUp}
        getOAuthAuthorizationUrlAction={mocks.getOAuthAuthorizationUrl}
        invalidate={mocks.invalidate}
      />,
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const action = await screen.findByRole('link', {
      name: 'Go to my account',
    });
    const url = new URL(action.getAttribute('href')!, 'https://board.example');
    expect(url.pathname).toBe('/auth/verify-email-required');
    expect(url.searchParams.get('returnTo')).toBe(returnTo);
  });
});
