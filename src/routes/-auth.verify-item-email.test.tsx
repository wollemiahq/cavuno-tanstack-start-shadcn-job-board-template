// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VerifyItemEmailView } from './-auth.verify-item-email';

import { m } from '@/paraglide/messages';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderRouted(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const account = createRoute({
    getParentRoute: () => rootRoute,
    path: '/account',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, account]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

async function confirmWith(result: { ok: true } | { ok: false; code: string }) {
  const confirmAction = vi.fn().mockResolvedValue(result);
  renderRouted(
    <VerifyItemEmailView token="tok" confirmAction={confirmAction} />,
  );
  fireEvent.click(
    await screen.findByRole('button', {
      name: m.authVerifyItemEmail_submitLabel(),
    }),
  );
  return confirmAction;
}

describe('/auth/verify-item-email', () => {
  it('shows the expired state without a token', async () => {
    renderRouted(<VerifyItemEmailView confirmAction={vi.fn()} />);
    expect(
      await screen.findByRole('heading', {
        name: m.authVerifyItemEmail_expiredTitle(),
      }),
    ).toBeInTheDocument();
  });

  it('confirms only on click, then links back to the profile', async () => {
    const confirmAction = await confirmWith({ ok: true });
    expect(
      await screen.findByRole('heading', {
        name: m.authVerifyItemEmail_successTitle(),
      }),
    ).toBeInTheDocument();
    expect(confirmAction).toHaveBeenCalledWith({ data: { token: 'tok' } });
    expect(
      screen.getByRole('link', { name: m.authVerifyItemEmail_backLabel() }),
    ).toHaveAttribute('href', '/account');
  });

  it('tells an expired link from an item that changed', async () => {
    await confirmWith({ ok: false, code: 'board_auth_invalid_token' });
    expect(
      await screen.findByRole('heading', {
        name: m.authVerifyItemEmail_expiredTitle(),
      }),
    ).toBeInTheDocument();
    cleanup();

    await confirmWith({ ok: false, code: 'item_verification_changed' });
    expect(
      await screen.findByText(m.authVerifyItemEmail_changedBody()),
    ).toBeInTheDocument();
  });

  it('keeps the form with a retryable error when the failure may pass', async () => {
    await confirmWith({ ok: false, code: 'rate_limited' });
    expect(
      await screen.findByText(m.candidateAction_errorText()),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: m.authVerifyItemEmail_submitLabel() }),
    ).toBeEnabled();
    cleanup();

    for (const code of [
      'item_verification_disabled',
      'item_verification_not_found',
      'item_verification_email_mismatch',
      'item_verification_no_domain',
    ]) {
      cleanup();
      await confirmWith({ ok: false, code });
      expect(
        await screen.findByText(m.authVerifyItemEmail_unavailableBody()),
      ).toBeInTheDocument();
    }
  });
});
