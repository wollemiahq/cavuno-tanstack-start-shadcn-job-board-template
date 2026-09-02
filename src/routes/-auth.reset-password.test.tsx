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

import type { UrlSearchInput } from '../lib/pagination';

const mocks = {
  redirectToSignIn: vi.fn(),
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


function renderRouted(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const stubs = ['/auth/forgot-password', '/auth/sign-in'].map((path) =>
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


describe('/auth/reset-password continuation', () => {
  it('retains a safe candidate destination with the reset token', async () => {
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

  it('keeps the destination when requesting a replacement reset link', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    renderRouted(
      <ResetPasswordView
        token={undefined}
        returnTo={returnTo}
        resetPasswordAction={mocks.resetPassword}
        redirectToSignIn={mocks.redirectToSignIn}
      />,
    );

    expect(
      await screen.findByRole('link', { name: 'Request a new link' }),
    ).toHaveAttribute(
      'href',
      `/auth/forgot-password?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });

  it('keeps the destination on sign-in after a successful reset', async () => {
    const returnTo = '/jobs?q=design&selectedJob=product-designer';
    mocks.resetPassword.mockResolvedValue({ ok: true });
    const { container } = renderRouted(
      <ResetPasswordView
        token="reset-token"
        returnTo={returnTo}
        resetPasswordAction={mocks.resetPassword}
        redirectToSignIn={mocks.redirectToSignIn}
      />,
    );
    await screen.findByRole('button');
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'strong-password' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Update password' }));

    await waitFor(() =>
      expect(mocks.redirectToSignIn).toHaveBeenCalledWith(
        `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}&reset=password`,
      ),
    );
  });

  it('recovers when the password update rejects unexpectedly', async () => {
    mocks.resetPassword.mockRejectedValue(new Error('network unavailable'));
    const { container } = renderRouted(
      <ResetPasswordView
        token="reset-token"
        returnTo="/account"
        resetPasswordAction={mocks.resetPassword}
        redirectToSignIn={mocks.redirectToSignIn}
      />,
    );
    await screen.findByRole('button');
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'strong-password' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Update password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );
    expect(
      await screen.findByRole('button', { name: 'Update password' }),
    ).toBeEnabled();
  });

  it('keeps typed single-use token failures distinct from generic failures', async () => {
    mocks.resetPassword.mockResolvedValue({
      ok: false,
      code: 'board_auth_token_expired',
      message: 'expired',
    });
    const { container } = renderRouted(
      <ResetPasswordView
        token="expired-token"
        returnTo="/account"
        resetPasswordAction={mocks.resetPassword}
        redirectToSignIn={mocks.redirectToSignIn}
      />,
    );
    await screen.findByRole('button');
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: 'strong-password' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Update password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This link is invalid or has expired — request a new one.',
    );
    expect(mocks.redirectToSignIn).not.toHaveBeenCalled();
  });
});
