// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/queries', () => ({
  getSeoBase: vi.fn().mockResolvedValue({ boardName: 'Acme Board' }),
}));

const mocks = vi.hoisted(() => ({
  requestEmailChange: vi.fn(),
  updatePassword: vi.fn(),
  requestSetPassword: vi.fn(),
}));

vi.mock('../server/settings', () => ({
  getNotificationPreferences: vi.fn(),
  getMarketingConsent: vi.fn(),
  getSettingsAccount: vi.fn(),
  unsubscribeWithToken: vi.fn(),
  requestEmailChange: mocks.requestEmailChange,
  updatePassword: mocks.updatePassword,
  requestSetPassword: mocks.requestSetPassword,
}));

vi.mock('../server/account', () => ({
  deleteAccount: vi.fn(),
}));

vi.mock('../server/auth', () => ({
  signOut: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: () => ({
      invalidate: vi.fn(),
      navigate: vi.fn(),
    }),
  };
});

import { Route } from './settings';

import { m } from '@/paraglide/messages';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

function renderSettings(
  overrides: {
    hasPassword?: boolean;
    preferences?: {
      channel: 'messageEmails' | 'applicationEmails';
      subscribed: boolean;
    }[];
  } = {},
) {
  vi.spyOn(Route, 'useLoaderData').mockReturnValue({
    mode: 'settings',
    preferences: overrides.preferences ?? [
      { channel: 'messageEmails', subscribed: true },
      { channel: 'applicationEmails', subscribed: true },
    ],
    consent: null,
    account: { ...account, hasPassword: overrides.hasPassword ?? true },
    seo: { boardName: 'Acme Board' },
  } as never);
  const SettingsPage = Route.options.component;
  if (!SettingsPage) throw new Error('The settings route needs a component');
  render(<SettingsPage />);
}

describe('settings unsubscribe recovery', () => {
  it('returns an expired-link recipient to settings after sign in', () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      mode: 'unsubscribe-failed',
    } as never);
    const SettingsPage = Route.options.component;
    if (!SettingsPage) throw new Error('The settings route needs a component');

    render(<SettingsPage />);

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

  it('renders notifications, email, password, then danger zone', () => {
    renderSettings();

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

  it('requests an email change and swaps to the pending notice', async () => {
    mocks.requestEmailChange.mockResolvedValue({ ok: true });
    renderSettings();

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
    expect(mocks.requestEmailChange).toHaveBeenCalledWith({
      data: { email: 'new@example.com' },
    });
  });

  it('renders email_taken and same_email inline', async () => {
    mocks.requestEmailChange.mockResolvedValue({
      ok: false,
      code: 'email_taken',
      message: 'taken',
    });
    renderSettings();

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
    mocks.updatePassword.mockResolvedValue({
      ok: false,
      code: 'invalid_current_password',
      message: 'wrong',
    });
    renderSettings();

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
    expect(mocks.updatePassword).toHaveBeenCalledWith({
      data: { currentPassword: 'oldpass99', newPassword: 'newpass99' },
    });
  });

  it('sends a set-password email for passwordless accounts', async () => {
    mocks.requestSetPassword.mockResolvedValue({ ok: true });
    renderSettings({ hasPassword: false });

    expect(
      document.querySelector('[data-test="settings-password-card"]'),
    ).toHaveAttribute('data-mode', 'set-password');
    fireEvent.click(
      screen.getByRole('button', { name: m.settingsPassword_setSubmitLabel() }),
    );

    await waitFor(() => {
      expect(mocks.requestSetPassword).toHaveBeenCalledWith({
        data: { email: 'ada@example.com' },
      });
    });
    expect(
      screen.getByText(m.settingsPassword_checkInbox()),
    ).toBeInTheDocument();
  });
});
