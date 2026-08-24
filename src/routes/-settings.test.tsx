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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SettingsPageView,
  createSettingsLoader,
  settingsRouteDependencies,
  type SettingsRouteDependencies,
} from './-settings';

import { m } from '@/paraglide/messages';

const requestEmailChange =
  vi.fn<SettingsRouteDependencies['requestEmailChange']>();
const updatePassword = vi.fn<SettingsRouteDependencies['updatePassword']>();
const requestSetPassword =
  vi.fn<SettingsRouteDependencies['requestSetPassword']>();
const updateNotificationPreference =
  vi.fn<SettingsRouteDependencies['updateNotificationPreference']>();
const unsubscribeWithToken =
  vi.fn<SettingsRouteDependencies['unsubscribeWithToken']>();
const dependencies: SettingsRouteDependencies = {
  ...settingsRouteDependencies,
  getSeoBase: vi.fn().mockResolvedValue({ boardName: 'Acme Board' }),
  requestEmailChange,
  updatePassword,
  requestSetPassword,
  updateNotificationPreference,
  unsubscribeWithToken,
};

function settingsLoaderContext() {
  const pathname = '/settings';
  return {
    abortController: new AbortController(),
    preload: false,
    params: {},
    deps: {
      token: 'signed-token',
      boardUserId: 'candidate-1',
      channel: 'recommendedJobEmails' as const,
    },
    context: { origin: 'https://board.example' },
    location: {
      href: pathname,
      pathname,
      search: {},
      searchStr: '',
      state: { __TSR_index: 0 },
      hash: '',
      publicHref: pathname,
      external: false,
    },
    navigate: vi.fn(),
    parentMatchPromise: new Promise<never>(() => undefined),
    cause: 'enter' as const,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const account = {
  id: 'user-1',
  object: 'board_user' as const,
  role: 'candidate' as const,
  email: 'ada@example.com',
  displayName: 'Ada',
  emailVerified: true,
  hasPassword: true,
};

async function renderSettings(
  overrides: {
    hasPassword?: boolean;
    preferences?: {
      object: 'notification_preference';
      channel: 'messageEmails' | 'applicationEmails' | 'recommendedJobEmails';
      subscribed: boolean;
      updatedAt: number | null;
    }[];
  } = {},
) {
  await renderSettingsData({
    mode: 'settings',
    preferences: overrides.preferences ?? [
      {
        object: 'notification_preference',
        channel: 'messageEmails',
        subscribed: true,
        updatedAt: null,
      },
      {
        object: 'notification_preference',
        channel: 'applicationEmails',
        subscribed: true,
        updatedAt: null,
      },
      {
        object: 'notification_preference',
        channel: 'recommendedJobEmails',
        subscribed: false,
        updatedAt: null,
      },
    ],
    consent: null,
    account: { ...account, hasPassword: overrides.hasPassword ?? true },
  });
}

async function renderSettingsData(
  data: Parameters<typeof SettingsPageView>[0]['data'],
) {
  const rootRoute = createRootRoute();
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <SettingsPageView data={data} dependencies={dependencies} />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
}

describe('settings unsubscribe recovery', () => {
  it('accepts a signed recommendation-email unsubscribe before auth', async () => {
    unsubscribeWithToken.mockResolvedValue({ ok: true });
    await expect(
      createSettingsLoader(dependencies)(settingsLoaderContext()),
    ).resolves.toMatchObject({
      mode: 'unsubscribed',
      channel: 'recommendedJobEmails',
    });
    expect(unsubscribeWithToken).toHaveBeenCalledWith({
      data: {
        token: 'signed-token',
        boardUserId: 'candidate-1',
        channel: 'recommendedJobEmails',
      },
    });
  });

  it('returns an expired-link recipient to settings after sign in', async () => {
    await renderSettingsData({ mode: 'unsubscribe-failed' });

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/auth/sign-in?returnTo=${encodeURIComponent('/settings')}`,
    );
  });
});

describe('signed-in settings account cards', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('renders notifications, email, password, then danger zone', async () => {
    await renderSettings();

    const notifications = document.querySelector(
      '[data-test="notification-settings"]',
    );
    const email = document.querySelector('[data-test="settings-email-card"]');
    const password = document.querySelector(
      '[data-test="settings-password-card"]',
    );
    const danger = document.querySelector('[data-test="danger-zone"]');
    if (!notifications || !email || !password || !danger) {
      throw new Error('Expected every settings section to render');
    }

    expect(
      notifications.compareDocumentPosition(email) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      email.compareDocumentPosition(password) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      password.compareDocumentPosition(danger) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Sign-in and security' }),
    ).toBeNull();
  });

  it('shows the candidate-controlled recommendation email preference', async () => {
    await renderSettings();
    expect(
      screen.getByRole('checkbox', {
        name: m.notificationSettings_recommendedJobEmailsTitle(),
      }),
    ).not.toBeChecked();
  });

  it('persists the recommendation preference immediately from settings', async () => {
    updateNotificationPreference.mockResolvedValue({
      object: 'list',
      url: '/v1/me/notification-preferences',
      count: 0,
      limit: 0,
      offset: 0,
      hasMore: false,
      nextCursor: null,
      data: [],
    });
    await renderSettings();
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: m.notificationSettings_recommendedJobEmailsTitle(),
      }),
    );
    await waitFor(() => {
      expect(updateNotificationPreference).toHaveBeenCalledWith({
        data: {
          channel: 'recommendedJobEmails',
          subscribed: true,
        },
      });
    });
  });

  it('requests an email change and swaps to the pending notice', async () => {
    requestEmailChange.mockResolvedValue({ ok: true });
    await renderSettings();

    fireEvent.change(screen.getByLabelText(m.settingsEmail_title()), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.settingsEmail_submitLabel() }),
    );

    expect(
      await screen.findByText(
        m.settingsEmail_pendingBody({ email: 'new@example.com' }),
      ),
    ).toBeInTheDocument();
    expect(requestEmailChange).toHaveBeenCalledWith({
      data: { email: 'new@example.com' },
    });
  });

  it('renders email_taken and same_email inline', async () => {
    requestEmailChange.mockResolvedValue({
      ok: false,
      code: 'email_taken',
      message: 'taken',
    });
    await renderSettings();

    fireEvent.change(screen.getByLabelText(m.settingsEmail_title()), {
      target: { value: 'taken@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.settingsEmail_submitLabel() }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.settingsEmail_takenError(),
    );

    // The input is prefilled with the current address and the submit
    // button disables while the value is unchanged, so same_email can no
    // longer be triggered from the UI (the server backstop remains).
    fireEvent.change(screen.getByLabelText(m.settingsEmail_title()), {
      target: { value: 'ada@example.com' },
    });
    expect(
      screen.getByRole('button', { name: m.settingsEmail_submitLabel() }),
    ).toBeDisabled();
  });

  it('updates a password and surfaces invalid_current_password inline', async () => {
    updatePassword.mockResolvedValue({
      ok: false,
      code: 'invalid_current_password',
      message: 'wrong',
    });
    await renderSettings();

    fireEvent.change(screen.getByLabelText(m.settingsPassword_currentLabel()), {
      target: { value: 'oldpass99' },
    });
    fireEvent.change(screen.getByLabelText(m.settingsPassword_newLabel()), {
      target: { value: 'newpass99' },
    });
    fireEvent.change(screen.getByLabelText(m.settingsPassword_confirmLabel()), {
      target: { value: 'newpass99' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.settingsPassword_submitLabel() }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.settingsPassword_invalidCurrentError(),
    );
    expect(updatePassword).toHaveBeenCalledWith({
      data: { currentPassword: 'oldpass99', newPassword: 'newpass99' },
    });
  });

  it('sends a set-password email for passwordless accounts', async () => {
    requestSetPassword.mockResolvedValue({ ok: true });
    await renderSettings({ hasPassword: false });

    expect(
      document.querySelector('[data-test="settings-password-card"]'),
    ).toHaveAttribute('data-mode', 'set-password');
    fireEvent.click(
      screen.getByRole('button', { name: m.settingsPassword_setSubmitLabel() }),
    );

    await waitFor(() => {
      expect(requestSetPassword).toHaveBeenCalledWith({
        data: { email: 'ada@example.com' },
      });
    });
    expect(
      screen.getByText(m.settingsPassword_checkInbox()),
    ).toBeInTheDocument();
  });
});
