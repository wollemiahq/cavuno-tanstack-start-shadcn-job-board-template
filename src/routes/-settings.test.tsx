// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  isRedirect,
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

import { localizePath } from '@/lib/localized-path';
import { m } from '@/paraglide/messages';

const requestEmailChange =
  vi.fn<SettingsRouteDependencies['requestEmailChange']>();
const updatePassword = vi.fn<SettingsRouteDependencies['updatePassword']>();
const requestSetPassword =
  vi.fn<SettingsRouteDependencies['requestSetPassword']>();
const updateNotificationPreference =
  vi.fn<SettingsRouteDependencies['updateNotificationPreference']>();
const keepUnsubscribeLink =
  vi.fn<SettingsRouteDependencies['keepUnsubscribeLink']>();
const getUnsubscribeLinkChannel =
  vi.fn<SettingsRouteDependencies['getUnsubscribeLinkChannel']>();
const unsubscribeWithLink =
  vi.fn<SettingsRouteDependencies['unsubscribeWithLink']>();
const getNotificationPreferences =
  vi.fn<SettingsRouteDependencies['getNotificationPreferences']>();
const dependencies: SettingsRouteDependencies = {
  ...settingsRouteDependencies,
  getSeoBase: vi.fn().mockResolvedValue({ boardName: 'Acme Board' }),
  requestEmailChange,
  updatePassword,
  requestSetPassword,
  updateNotificationPreference,
  keepUnsubscribeLink,
  getUnsubscribeLinkChannel,
  unsubscribeWithLink,
  getNotificationPreferences,
};

const LINK = '0123456789abcdef';

const EMAIL_LINK = {
  token: 'signed-token',
  boardUserId: 'candidate-1',
  channel: 'recommendedJobEmails' as const,
};

function settingsLoaderContext(
  deps: Parameters<ReturnType<typeof createSettingsLoader>>[0]['deps'],
) {
  const pathname = '/settings';
  return {
    abortController: new AbortController(),
    preload: false,
    params: {},
    deps,
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
    role?: 'candidate' | 'employer';
    jobRecommendationsEnabled?: boolean;
    preferences?: {
      object: 'notification_preference';
      channel: 'messageEmails' | 'applicationEmails' | 'recommendedJobEmails';
      subscribed: boolean;
      waitlisted: boolean;
      updatedAt: number | null;
    }[];
  } = {},
) {
  await renderSettingsData(
    {
      mode: 'settings',
      preferences: overrides.preferences ?? [
        {
          object: 'notification_preference',
          channel: 'messageEmails',
          subscribed: true,
          waitlisted: false,
          updatedAt: null,
        },
        {
          object: 'notification_preference',
          channel: 'applicationEmails',
          subscribed: true,
          waitlisted: false,
          updatedAt: null,
        },
        {
          object: 'notification_preference',
          channel: 'recommendedJobEmails',
          subscribed: false,
          waitlisted: false,
          updatedAt: null,
        },
      ],
      consent: null,
      account: {
        ...account,
        hasPassword: overrides.hasPassword ?? true,
        role: overrides.role ?? account.role,
      },
    },
    overrides.jobRecommendationsEnabled,
  );
}

async function renderSettingsData(
  data: Parameters<typeof SettingsPageView>[0]['data'],
  jobRecommendationsEnabled = true,
) {
  const rootRoute = createRootRoute();
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <SettingsPageView
        data={data}
        jobRecommendationsEnabled={jobRecommendationsEnabled}
        dependencies={dependencies}
      />
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
  it('keeps the email link in a cookie and opens the page with only its key', async () => {
    keepUnsubscribeLink.mockResolvedValue(LINK);
    let error;
    try {
      await createSettingsLoader(dependencies)(
        settingsLoaderContext(EMAIL_LINK),
      );
    } catch (thrown) {
      error = thrown;
    }

    if (!isRedirect(error)) throw new Error('Expected a redirect');
    expect(error.options).toMatchObject({
      to: '/settings',
      search: { link: LINK },
    });
    expect(keepUnsubscribeLink).toHaveBeenCalledWith({ data: EMAIL_LINK });
    expect(unsubscribeWithLink).not.toHaveBeenCalled();
    expect(getNotificationPreferences).not.toHaveBeenCalled();
  });

  it('opening the link only reads, before auth; the click unsubscribes', async () => {
    getUnsubscribeLinkChannel.mockResolvedValue('recommendedJobEmails');
    const data = await createSettingsLoader(dependencies)(
      settingsLoaderContext({ link: LINK }),
    );
    expect(data).toMatchObject({
      mode: 'unsubscribe',
      channel: 'recommendedJobEmails',
      link: LINK,
    });
    expect(unsubscribeWithLink).not.toHaveBeenCalled();
    expect(getNotificationPreferences).not.toHaveBeenCalled();

    unsubscribeWithLink.mockResolvedValue({ ok: true });
    await renderSettingsData({
      mode: 'unsubscribe',
      channel: 'recommendedJobEmails',
      link: LINK,
    });
    const channel = m.settings_channelRecommendedJobs();
    expect(unsubscribeWithLink).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', {
        name: m.settings_unsubscribeCta({ channel }),
      }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      m.settings_unsubscribedBody({ channel }),
    );
    expect(unsubscribeWithLink).toHaveBeenCalledExactlyOnceWith({
      data: { link: LINK },
    });
  });

  it('keeps the button and says to reopen the link when the click fails', async () => {
    unsubscribeWithLink.mockRejectedValue(new Error('email_link_expired'));
    await renderSettingsData({
      mode: 'unsubscribe',
      channel: 'messageEmails',
      link: LINK,
    });
    const name = m.settings_unsubscribeCta({
      channel: m.settings_channelMessage(),
    });
    fireEvent.click(screen.getByRole('button', { name }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.settings_unsubscribeError(),
    );
    expect(screen.getByRole('button', { name })).toBeEnabled();
  });

  it('shows the expired-link page when nothing is kept under the key', async () => {
    getUnsubscribeLinkChannel.mockResolvedValue(null);
    await expect(
      createSettingsLoader(dependencies)(
        settingsLoaderContext({ link: 'invalid' }),
      ),
    ).resolves.toMatchObject({ mode: 'unsubscribe-failed' });
  });

  it('returns an expired-link recipient to settings after sign in', async () => {
    await renderSettingsData({ mode: 'unsubscribe-failed' });

    expect(
      screen.getByRole('link', { name: m.settings_signInLabel() }),
    ).toHaveAttribute(
      'href',
      `/auth/sign-in?returnTo=${encodeURIComponent(localizePath('/settings'))}`,
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
    const checkbox = screen.getByRole('checkbox', {
      name: m.notificationSettings_recommendedJobEmailsTitle(),
    });
    expect(checkbox).not.toBeChecked();
    expect(document.getElementById('job-match-emails')).toContainElement(
      checkbox,
    );
  });

  it('gives an employer the new-application channel without job-seeker emails', async () => {
    await renderSettings({ role: 'employer' });

    expect(
      screen.getByRole('checkbox', {
        name: m.notificationSettings_messageEmailsTitle(),
      }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', {
        name: m.notificationSettings_employerApplicationEmailsTitle(),
      }),
    ).toBeChecked();
    expect(
      screen.getByText(
        m.notificationSettings_employerApplicationEmailsDescription(),
      ),
    ).toBeInTheDocument();
    for (const name of [
      m.notificationSettings_applicationEmailsTitle(),
      m.notificationSettings_recommendedJobEmailsTitle(),
    ]) {
      expect(screen.queryByRole('checkbox', { name })).toBeNull();
    }
    expect(
      document.querySelector('[data-test="settings-email-card"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-test="danger-zone"]'),
    ).toBeInTheDocument();
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

  it('shows a paused recommendation preference without allowing a fresh opt-in', async () => {
    await renderSettings({ jobRecommendationsEnabled: false });

    const checkbox = screen.getByRole('checkbox', {
      name: m.notificationSettings_recommendedJobEmailsTitle(),
    });
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(m.alertManager_pausedBadge())).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(updateNotificationPreference).not.toHaveBeenCalled();
  });

  it('still allows opting out of recommendation emails while the feature is paused', async () => {
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
    await renderSettings({
      jobRecommendationsEnabled: false,
      preferences: [
        {
          object: 'notification_preference',
          channel: 'messageEmails',
          subscribed: true,
          waitlisted: false,
          updatedAt: null,
        },
        {
          object: 'notification_preference',
          channel: 'applicationEmails',
          subscribed: true,
          waitlisted: false,
          updatedAt: null,
        },
        {
          object: 'notification_preference',
          channel: 'recommendedJobEmails',
          subscribed: true,
          waitlisted: false,
          updatedAt: null,
        },
      ],
    });

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: m.notificationSettings_recommendedJobEmailsTitle(),
      }),
    );
    await waitFor(() => {
      expect(updateNotificationPreference).toHaveBeenCalledWith({
        data: {
          channel: 'recommendedJobEmails',
          subscribed: false,
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
      await screen.findByText(m.settingsPassword_checkInbox()),
    ).toBeInTheDocument();
  });
});
