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

import { m } from '../paraglide/messages';

import type { UrlSearchInput } from '../lib/pagination';
import { localizePath } from '@/lib/localized-path';

const forgotPassword = vi.fn();

import { ForgotPasswordView } from './-auth.forgot-password';
import { Route } from './auth.forgot-password';

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

function renderRouted(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const stubs = ['/auth/sign-in'].map((path) =>
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

describe('/auth/forgot-password continuation', () => {
  it('sanitizes and retains an internal candidate destination', async () => {
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
    const { container } = renderRouted(
      <ForgotPasswordView
        returnTo={returnTo}
        forgotPasswordAction={forgotPassword}
      />,
    );
    await screen.findByRole('button', {
      name: m.authForgotPassword_submitLabel(),
    });
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authForgotPassword_submitLabel(),
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('link', {
          name: m.authForgotPassword_backToSignInLabel(),
        }),
      ).toHaveAttribute(
        'href',
        `/auth/sign-in?returnTo=${encodeURIComponent(localizePath(returnTo))}`,
      );
    });
  });

  it('recovers when the reset-link request rejects unexpectedly', async () => {
    forgotPassword.mockRejectedValue(new Error('network unavailable'));
    const { container } = renderRouted(
      <ForgotPasswordView
        returnTo="/account"
        forgotPasswordAction={forgotPassword}
      />,
    );
    await screen.findByRole('button');
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: m.authForgotPassword_submitLabel(),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.candidateAction_errorText(),
    );
    expect(
      screen.getByRole('button', {
        name: m.authForgotPassword_submitLabel(),
      }),
    ).toBeEnabled();
  });
});
