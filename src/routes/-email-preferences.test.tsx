// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { isRedirect } from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmailPreferencesPageView } from './-email-preferences';
import {
  createEmailPreferencesLoader,
  emailPreferencesHead,
  type EmailPreferencesData,
  type EmailPreferencesDependencies,
} from './-email-preferences-loader';

import { m } from '@/paraglide/messages';
import type { EmailPreferences } from '@cavuno/board';

const BOARD = 'Example Board';
const PERSON = '0123456789abcdef';

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
  topics: [
    { key: 'events', name: 'Events', subscribed: true },
    { key: 'salary-reports', name: 'Salary reports', subscribed: false },
  ],
} satisfies EmailPreferences;

function dependencies() {
  return {
    keepEmailPreferencesToken:
      vi.fn<EmailPreferencesDependencies['keepEmailPreferencesToken']>(),
    getEmailPreferences:
      vi.fn<EmailPreferencesDependencies['getEmailPreferences']>(),
    getSeoBase: vi.fn(async () => ({ boardName: BOARD })),
    updateEmailPreferences:
      vi.fn<EmailPreferencesDependencies['updateEmailPreferences']>(),
    unsubscribeAllEmailPreferences:
      vi.fn<EmailPreferencesDependencies['unsubscribeAllEmailPreferences']>(),
  };
}

function renderPage(
  data: Partial<EmailPreferencesData>,
  deps = dependencies(),
) {
  render(
    <EmailPreferencesPageView
      data={{ prefs, person: PERSON, seo: { boardName: BOARD }, ...data }}
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
  it('keeps the link token in the cookie and opens the page again with only its key', async () => {
    const deps = dependencies();
    deps.keepEmailPreferencesToken.mockResolvedValue(PERSON);
    const load = createEmailPreferencesLoader(deps);
    await expect(load({ deps: { token: 'tok' } })).rejects.toSatisfy(
      isRedirect,
    );
    await expect(load({ deps: { token: 'tok' } })).rejects.toMatchObject({
      options: { to: '/email-preferences', search: { person: PERSON } },
    });
    expect(deps.keepEmailPreferencesToken).toHaveBeenCalledWith({
      data: { token: 'tok' },
    });
    expect(deps.getEmailPreferences).not.toHaveBeenCalled();
  });

  it('opens with no person when the link token is malformed, so the page says it is invalid', async () => {
    const deps = dependencies();
    deps.keepEmailPreferencesToken.mockResolvedValue(null);
    const load = createEmailPreferencesLoader(deps);
    await expect(load({ deps: { token: 'bad;x' } })).rejects.toMatchObject({
      options: { to: '/email-preferences', search: {} },
    });
  });

  it('reads with the token kept for the person, and marks the page noindex', async () => {
    const deps = dependencies();
    deps.getEmailPreferences.mockResolvedValue(prefs);
    const load = createEmailPreferencesLoader(deps);
    expect(await load({ deps: { person: PERSON } })).toEqual({
      prefs,
      person: PERSON,
      seo: { boardName: BOARD },
    });
    expect(deps.getEmailPreferences).toHaveBeenCalledWith({
      data: { person: PERSON },
    });
    expect(deps.keepEmailPreferencesToken).not.toHaveBeenCalled();
    expect(emailPreferencesHead(undefined).meta).toContainEqual({
      name: 'robots',
      content: 'noindex',
    });
  });
});

describe('email preferences page', () => {
  it('explains an invalid link instead of showing switches', () => {
    renderPage({ prefs: 'invalid_link' });
    expect(
      screen.getByText(m.emailPreferences_invalidTitle()),
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('asks to open the email link again when no token is kept, not that the link is invalid', () => {
    renderPage({ prefs: 'link_expired' });
    expect(
      screen.getByText(m.emailPreferences_expiredTitle()),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(m.emailPreferences_invalidTitle()),
    ).not.toBeInTheDocument();
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
        person: PERSON,
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

  it('a topic sends only itself, with wording naming it and the board only when turned on', async () => {
    const deps = dependencies();
    const marketingOn = { ...prefs, marketing: { subscribed: true } };
    deps.updateEmailPreferences.mockResolvedValue(marketingOn);
    renderPage({ prefs: marketingOn }, deps);

    fireEvent.click(screen.getByRole('switch', { name: 'Events' }));
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledTimes(1),
    );
    expect(deps.updateEmailPreferences).toHaveBeenLastCalledWith({
      data: {
        person: PERSON,
        changes: { topics: [{ key: 'events', subscribed: false }] },
      },
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Salary reports' }));
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledTimes(2),
    );
    expect(deps.updateEmailPreferences).toHaveBeenLastCalledWith({
      data: {
        person: PERSON,
        changes: {
          topics: [{ key: 'salary-reports', subscribed: true }],
          consentText: m.emailPreferences_topicConsent({
            topic: 'Salary reports',
            board: BOARD,
          }),
          source: 'email-preferences',
        },
      },
    });
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
        person: PERSON,
        changes: { alerts: [{ id: 'alert-1', delete: true }] },
      },
    });
  });

  it('shows an error and the preferences as they are now when a change fails', async () => {
    const deps = dependencies();
    deps.updateEmailPreferences.mockRejectedValue(new Error('down'));
    deps.getEmailPreferences.mockResolvedValue(prefs);
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

  it('turns into the invalid-link page when the link stopped working mid-visit', async () => {
    const deps = dependencies();
    deps.updateEmailPreferences.mockRejectedValue(new Error('403'));
    deps.getEmailPreferences.mockResolvedValue('invalid_link');
    renderPage({}, deps);

    fireEvent.click(
      screen.getByRole('switch', { name: m.emailPreferences_marketingTitle() }),
    );
    expect(
      await screen.findByText(m.emailPreferences_invalidTitle()),
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('shows job matches only when the board offers them, sending only that change', async () => {
    renderPage({});
    expect(
      screen.queryByRole('switch', {
        name: m.emailPreferences_jobMatchesTitle(),
      }),
    ).not.toBeInTheDocument();
    cleanup();

    const deps = dependencies();
    deps.updateEmailPreferences.mockResolvedValue(prefs);
    renderPage(
      {
        prefs: {
          ...prefs,
          jobMatches: { subscribed: true, waitlisted: false },
        },
      },
      deps,
    );
    fireEvent.click(
      screen.getByRole('switch', {
        name: m.emailPreferences_jobMatchesTitle(),
      }),
    );
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
        data: { person: PERSON, changes: { jobMatches: false } },
      }),
    );
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
      data: { person: PERSON },
    });
  });
});
