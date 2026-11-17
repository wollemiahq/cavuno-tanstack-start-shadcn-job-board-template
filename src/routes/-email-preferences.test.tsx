// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  EmailPreferencesPageView,
  type EmailPreferencesPageDependencies,
} from './-email-preferences';
import {
  createEmailPreferencesLoader,
  emailPreferencesHead,
  type EmailPreferencesData,
} from './-email-preferences-loader';

import { m } from '@/paraglide/messages';
import type { EmailPreferences } from '@cavuno/board';

const BOARD = 'Example Board';

const prefs = {
  object: 'email_preferences',
  email: 'person@example.com',
  jobAlerts: {
    confirmed: true,
    unsubscribed: false,
    alerts: [
      {
        id: 'alert-1',
        label: 'Design jobs',
        frequency: 'weekly',
        isActive: true,
        awaitingConfirmation: false,
        kind: 'filters',
        anchorJob: null,
        filters: {},
      },
    ],
  },
  jobMatches: null,
  marketing: { subscribed: false },
  topics: [{ key: 'events', name: 'Events', subscribed: true }],
} satisfies EmailPreferences;

function dependencies() {
  return {
    updateEmailPreferences:
      vi.fn<EmailPreferencesPageDependencies['updateEmailPreferences']>(),
    unsubscribeAllEmailPreferences:
      vi.fn<
        EmailPreferencesPageDependencies['unsubscribeAllEmailPreferences']
      >(),
  };
}

function renderPage(
  data: Partial<EmailPreferencesData>,
  deps = dependencies(),
  token: string | undefined = 'tok',
) {
  render(
    <EmailPreferencesPageView
      data={{ prefs, seo: { boardName: BOARD }, ...data }}
      token={token}
      dependencies={deps}
    />,
  );
  return deps;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('email preferences loader', () => {
  it('reads nothing without a token, and marks the page noindex', async () => {
    const getEmailPreferences = vi.fn();
    const load = createEmailPreferencesLoader({
      getEmailPreferences,
      getSeoBase: async () => ({ boardName: BOARD }),
    });
    expect(await load({ deps: {} })).toEqual({
      prefs: null,
      seo: { boardName: BOARD },
    });
    expect(getEmailPreferences).not.toHaveBeenCalled();
    expect(emailPreferencesHead(undefined).meta).toContainEqual({
      name: 'robots',
      content: 'noindex',
    });
  });
});

describe('email preferences page', () => {
  it('explains an invalid link instead of showing switches', () => {
    renderPage({ prefs: null });
    expect(
      screen.getByText(m.emailPreferences_invalidTitle()),
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('turning marketing on sends only that change, with consent wording naming the board', async () => {
    const deps = dependencies();
    deps.updateEmailPreferences.mockResolvedValue({
      ...prefs,
      marketing: { subscribed: true },
    });
    renderPage({}, deps);

    const topic = screen.getByRole('switch', { name: 'Events' });
    // A topic narrows marketing: off and disabled with it.
    expect(topic).not.toBeChecked();
    expect(topic).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(
      screen.getByRole('switch', { name: m.emailPreferences_marketingTitle() }),
    );
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledTimes(1),
    );
    expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
      data: {
        token: 'tok',
        changes: {
          marketing: true,
          consentText: m.emailPreferences_marketingConsent({ board: BOARD }),
          source: 'email-preferences',
        },
      },
    });
    // The page shows what the API returned.
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Events' })).toBeChecked(),
    );
  });

  it('deleting an alert sends only that alert', async () => {
    const deps = dependencies();
    deps.updateEmailPreferences.mockResolvedValue({
      ...prefs,
      jobAlerts: { ...prefs.jobAlerts, alerts: [] },
    });
    renderPage({}, deps);

    fireEvent.click(
      screen.getByRole('button', {
        name: m.emailPreferences_deleteAlertLabel({ label: 'Design jobs' }),
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(m.emailPreferences_jobAlertsNone()),
      ).toBeInTheDocument(),
    );
    expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
      data: {
        token: 'tok',
        changes: { alerts: [{ id: 'alert-1', delete: true }] },
      },
    });
  });

  it('shows an error and keeps the preferences when a change fails', async () => {
    const deps = dependencies();
    deps.updateEmailPreferences.mockRejectedValue(new Error('down'));
    renderPage({}, deps);

    fireEvent.click(
      screen.getByRole('switch', { name: m.emailPreferences_marketingTitle() }),
    );
    expect(
      await screen.findByText(m.emailPreferences_actionError()),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: m.emailPreferences_marketingTitle() }),
    ).not.toBeChecked();
  });

  it('asks before unsubscribing from everything', async () => {
    const deps = dependencies();
    deps.unsubscribeAllEmailPreferences.mockResolvedValue({
      ...prefs,
      jobAlerts: { ...prefs.jobAlerts, unsubscribed: true },
    });
    renderPage({}, deps);

    fireEvent.click(
      screen.getByRole('button', { name: m.emailPreferences_unsubscribeAll() }),
    );
    expect(deps.unsubscribeAllEmailPreferences).not.toHaveBeenCalled();
    fireEvent.click(
      await screen.findByRole('button', {
        name: m.emailPreferences_unsubscribeAllConfirm(),
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(m.emailPreferences_unsubscribedAll({ board: BOARD })),
      ).toBeInTheDocument(),
    );
    expect(deps.unsubscribeAllEmailPreferences).toHaveBeenCalledWith({
      data: { token: 'tok' },
    });
  });
});
