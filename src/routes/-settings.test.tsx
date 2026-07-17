// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The route threads getSeoBase through its loader for the page title; the
// module resolves cloudflare:workers, so stub the seam for jsdom.
vi.mock('../server/queries', () => ({
  getSeoBase: vi.fn().mockResolvedValue({ boardName: 'Acme Board' }),
}));

vi.mock('../server/settings', () => ({
  getNotificationPreferences: vi.fn(),
  unsubscribeWithToken: vi.fn(),
}));

// The Danger zone (account delete) renders on the signed-in settings page and
// pulls in the account/auth server seams.
vi.mock('../server/account', () => ({
  deleteAccount: vi.fn(),
}));

vi.mock('../server/auth', () => ({
  signOut: vi.fn(),
}));

import { Route } from './settings';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('settings unsubscribe recovery', () => {
  it('returns an expired-link recipient to settings after sign in', () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      mode: 'unsubscribe-failed',
    });
    const SettingsPage = Route.options.component;
    if (!SettingsPage) throw new Error('The settings route needs a component');

    render(<SettingsPage />);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/auth/sign-in?returnTo=${encodeURIComponent('/settings')}`,
    );
  });
});
