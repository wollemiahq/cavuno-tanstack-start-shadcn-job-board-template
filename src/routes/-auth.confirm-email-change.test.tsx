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

const mocks = {
  confirmEmailChange: vi.fn(),
};

import { ConfirmEmailChangeView } from './-auth.confirm-email-change';

import { m } from '@/paraglide/messages';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});


function renderRouted(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const stubs = ['/settings'].map((path) =>
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

describe('/auth/confirm-email-change', () => {
  it('asks the visitor to request a new change when the token is missing', async () => {
    renderRouted(
      <ConfirmEmailChangeView
        token={undefined}
        confirmEmailChangeAction={mocks.confirmEmailChange}
      />,
    );

    expect(
      await screen.findByRole('heading', {
        name: m.authConfirmEmailChange_invalidTitle(),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: m.authConfirmEmailChange_backToSettingsLabel(),
      }),
    ).toHaveAttribute('href', '/settings');
  });

  it('confirms a valid token and links back to settings', async () => {
    mocks.confirmEmailChange.mockResolvedValue({ ok: true });
    renderRouted(
      <ConfirmEmailChangeView
        token="tok"
        confirmEmailChangeAction={mocks.confirmEmailChange}
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: m.authConfirmEmailChange_submitLabel(),
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: m.authConfirmEmailChange_successTitle(),
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('link', {
        name: m.authConfirmEmailChange_backToSettingsLabel(),
      }),
    ).toHaveAttribute('href', '/settings');
    expect(mocks.confirmEmailChange).toHaveBeenCalledWith({
      data: { token: 'tok' },
    });
  });

  it('renders invalid_token and email_taken as distinct states', async () => {
    mocks.confirmEmailChange.mockResolvedValue({
      ok: false,
      code: 'invalid_token',
      message: 'expired',
    });
    renderRouted(
      <ConfirmEmailChangeView
        token="tok"
        confirmEmailChangeAction={mocks.confirmEmailChange}
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: m.authConfirmEmailChange_submitLabel(),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.authConfirmEmailChange_invalidTokenBody(),
    );

    mocks.confirmEmailChange.mockResolvedValue({
      ok: false,
      code: 'email_taken',
      message: 'taken',
    });
    fireEvent.click(
      await screen.findByRole('button', {
        name: m.authConfirmEmailChange_submitLabel(),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.authConfirmEmailChange_emailTakenBody(),
    );
  });
});
