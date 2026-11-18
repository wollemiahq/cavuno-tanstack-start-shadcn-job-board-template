// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { BoardApiError } from '@cavuno/board';
import { isRedirect } from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
const NO_NAMES = { categories: {}, places: {} };
const PERSON = '0123456789abcdef';

const prefs = {
  object: 'email_preferences',
  email: 'person@example.com',
  jobAlerts: {
    confirmed: true,
    unsubscribed: false,
    waitlisted: false,
    alerts: [
      {
        id: 'alert-1',
        label: 'Design jobs',
        frequency: 'weekly',
        isActive: true,
        paused: false,
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
    getAlertFilterNames:
      vi.fn<EmailPreferencesDependencies['getAlertFilterNames']>(),
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
      data={{
        prefs,
        person: PERSON,
        seo: { boardName: BOARD },
        filterNames: NO_NAMES,
        ...data,
      }}
      dependencies={deps}
    />,
  );
  return deps;
}

/** The ⋯ button of the alert with this name. */
function alertActions(label: string) {
  return screen.getByRole('button', {
    name: m.emailPreferences_alertActionsLabel({ label }),
  });
}

/** The list item of the alert with this name. */
function alertRow(label: string) {
  const row = alertActions(label).closest('li');
  expect(row).toBeInstanceOf(HTMLElement);
  // SAFETY: checked to be an HTMLElement on the line above.
  return row as HTMLElement;
}

/** Opens an alert's ⋯ menu and returns the names of its items. */
async function openAlertMenu(label: string) {
  fireEvent.click(alertActions(label));
  const items = await screen.findAllByRole('menuitem');
  return items.map((item) => item.textContent);
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
      filterNames: NO_NAMES,
    });
    // A named alert with no category or place needs no names.
    expect(deps.getAlertFilterNames).not.toHaveBeenCalled();
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

  it('deleting an alert from its menu sends only that alert', async () => {
    const deps = dependencies();
    deps.updateEmailPreferences.mockResolvedValue({
      ...prefs,
      jobAlerts: { ...prefs.jobAlerts, alerts: [] },
    });
    renderPage({}, deps);

    await openAlertMenu('Design jobs');
    fireEvent.click(
      screen.getByRole('menuitem', { name: m.emailPreferences_deleteAlert() }),
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

  it('shows a paused alert with a badge and a waitlisted board as not sending, with one job alerts switch', () => {
    renderPage({
      prefs: {
        ...prefs,
        jobAlerts: {
          ...prefs.jobAlerts,
          waitlisted: true,
          alerts: [
            { ...prefs.jobAlerts.alerts[0], paused: true },
            { ...prefs.jobAlerts.alerts[0], id: 'alert-2', label: 'Ops jobs' },
          ],
        },
      },
    });
    expect(
      screen.getByText(
        m.emailPreferences_jobMatchesWaitlisted({ board: BOARD }),
      ),
    ).toBeInTheDocument();
    expect(
      within(alertRow('Design jobs')).getByText(m.alertsManage_pausedBadge()),
    ).toBeInTheDocument();
    expect(
      within(alertRow('Ops jobs')).queryByText(m.alertsManage_pausedBadge()),
    ).not.toBeInTheDocument();
    // The job alerts switch is the only one in the card; rows have none.
    const card = screen.getByRole('region', {
      name: m.emailPreferences_jobAlertsTitle(),
    });
    expect(within(card).getAllByRole('switch')).toEqual([
      screen.getByRole('switch', { name: m.emailPreferences_jobAlertsAll() }),
    ]);
    expect(within(card).getAllByRole('switch')[0]).toBeChecked();
  });

  it('keeps the alerts and their menus while job alerts are off', async () => {
    const deps = dependencies();
    const off = {
      ...prefs,
      jobAlerts: { ...prefs.jobAlerts, unsubscribed: true },
    };
    deps.updateEmailPreferences.mockResolvedValue(off);
    renderPage({ prefs: off }, deps);
    expect(
      screen.getByText(m.emailPreferences_jobAlertsOff()),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: m.emailPreferences_jobAlertsAll() }),
    ).not.toBeChecked();
    expect(
      within(alertRow('Design jobs')).queryByRole('switch'),
    ).not.toBeInTheDocument();

    await openAlertMenu('Design jobs');
    fireEvent.click(
      screen.getByRole('menuitem', { name: m.emailPreferences_pauseAlert() }),
    );
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
        data: {
          person: PERSON,
          changes: { alerts: [{ id: 'alert-1', paused: true }] },
        },
      }),
    );
  });

  it('names each alert from its filters, as /alerts/manage does, with no cadence', async () => {
    const base = { ...prefs.jobAlerts.alerts[0], label: null };
    const withAlerts = {
      ...prefs,
      jobAlerts: {
        ...prefs.jobAlerts,
        alerts: [
          {
            ...base,
            id: 'alert-search',
            kind: 'search' as const,
            filters: {
              query: 'pilot',
              jobFunctions: ['flight-ops'],
              placeIds: ['place-berlin'],
            },
          },
          {
            ...base,
            id: 'alert-roles',
            filters: { jobFunctions: ['a', 'b', 'c', 'd'] },
          },
        ],
      },
    };
    const names = {
      categories: { 'flight-ops': 'Flight operations', a: 'A', b: 'B' },
      places: { 'place-berlin': 'Berlin' },
    };
    // The loader reads the names once, for every alert.
    const deps = dependencies();
    deps.getEmailPreferences.mockResolvedValue(withAlerts);
    deps.getAlertFilterNames.mockResolvedValue(names);
    const loaded = await createEmailPreferencesLoader(deps)({
      deps: { person: PERSON },
    });
    expect(deps.getAlertFilterNames).toHaveBeenCalledExactlyOnceWith({
      data: {
        categorySlugs: ['flight-ops', 'a', 'b', 'c', 'd'],
        placeIds: ['place-berlin'],
      },
    });
    expect(loaded.filterNames).toEqual(names);

    renderPage({ prefs: withAlerts, filterNames: names });
    const search = alertRow(m.jobAlertMatch_jobsMatching({ query: 'pilot' }));
    expect(
      within(search).getByText('Flight operations · Berlin'),
    ).toBeInTheDocument();
    expect(
      alertRow(m.jobAlertMatch_jobsInMore({ categories: 'A, B', count: 2 })),
    ).toBeInTheDocument();
  });

  it('names a similar-job alert without a label by its job', () => {
    renderPage({
      prefs: {
        ...prefs,
        jobAlerts: {
          ...prefs.jobAlerts,
          alerts: [
            {
              ...prefs.jobAlerts.alerts[0],
              label: null,
              kind: 'similar_job',
              anchorJob: { id: 'job-1', slug: 'pilot', title: 'Line pilot' },
            },
          ],
        },
      },
    });
    expect(
      alertActions(m.jobAlertMatch_similarTo({ title: 'Line pilot' })),
    ).toBeInTheDocument();
  });

  it('offers only Delete to a person who never confirmed, since a pause would do nothing', async () => {
    renderPage({
      prefs: {
        ...prefs,
        jobAlerts: { ...prefs.jobAlerts, confirmed: false, unsubscribed: true },
      },
    });
    expect(await openAlertMenu('Design jobs')).toEqual([
      m.emailPreferences_deleteAlert(),
    ]);
  });

  it('keeps the menu button focusable while a change saves, with its items waiting', async () => {
    const deps = dependencies();
    let finish: (value: EmailPreferences) => void = () => {};
    deps.updateEmailPreferences.mockReturnValue(
      new Promise<EmailPreferences>((resolve) => {
        finish = resolve;
      }),
    );
    renderPage({}, deps);
    await openAlertMenu('Design jobs');
    fireEvent.click(
      screen.getByRole('menuitem', { name: m.emailPreferences_pauseAlert() }),
    );
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledTimes(1),
    );
    expect(alertActions('Design jobs')).toBeEnabled();
    await openAlertMenu('Design jobs');
    for (const item of screen.getAllByRole('menuitem')) {
      expect(item).toHaveAttribute('aria-disabled', 'true');
    }
    fireEvent.click(
      screen.getByRole('menuitem', { name: m.emailPreferences_deleteAlert() }),
    );
    expect(deps.updateEmailPreferences).toHaveBeenCalledTimes(1);
    finish(prefs);
  });

  it('lets an alert waiting for its confirmation link only be deleted', async () => {
    renderPage({
      prefs: {
        ...prefs,
        jobAlerts: {
          ...prefs.jobAlerts,
          alerts: [
            { ...prefs.jobAlerts.alerts[0], awaitingConfirmation: true },
          ],
        },
      },
    });
    expect(
      within(alertRow('Design jobs')).getByText(
        m.emailPreferences_alertAwaiting(),
      ),
    ).toBeInTheDocument();
    expect(await openAlertMenu('Design jobs')).toEqual([
      m.emailPreferences_deleteAlert(),
    ]);
  });

  it.each([
    [false, m.emailPreferences_pauseAlert, true],
    [true, m.emailPreferences_resumeAlert, false],
  ])(
    'an alert that is paused=%s offers %s in its menu, which sends only that alert',
    async (paused, item, next) => {
      const deps = dependencies();
      const before = {
        ...prefs,
        jobAlerts: {
          ...prefs.jobAlerts,
          alerts: [{ ...prefs.jobAlerts.alerts[0], paused }],
        },
      };
      deps.updateEmailPreferences.mockResolvedValue(before);
      renderPage({ prefs: before }, deps);
      expect(await openAlertMenu('Design jobs')).toEqual([
        item(),
        m.emailPreferences_deleteAlert(),
      ]);
      fireEvent.click(screen.getByRole('menuitem', { name: item() }));
      await waitFor(() =>
        expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
          data: {
            person: PERSON,
            changes: { alerts: [{ id: 'alert-1', paused: next }] },
          },
        }),
      );
    },
  );

  it('turning job alerts back on says a confirmation link is on its way', async () => {
    const deps = dependencies();
    deps.updateEmailPreferences.mockResolvedValue({
      ...prefs,
      jobAlerts: {
        ...prefs.jobAlerts,
        alerts: [{ ...prefs.jobAlerts.alerts[0], awaitingConfirmation: true }],
      },
    });
    renderPage(
      {
        prefs: {
          ...prefs,
          jobAlerts: { ...prefs.jobAlerts, unsubscribed: true },
        },
      },
      deps,
    );
    fireEvent.click(
      screen.getByRole('switch', { name: m.emailPreferences_jobAlertsAll() }),
    );
    expect(
      await screen.findByText(m.emailPreferences_jobAlertsLinkSent()),
    ).toBeInTheDocument();
    expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
      data: { person: PERSON, changes: { jobAlerts: true } },
    });
  });

  it.each([
    ['rate_limited', 429, () => m.emailPreferences_jobAlertsThrottled()],
    [
      'job_alert_email_suppressed',
      409,
      () => m.emailPreferences_jobAlertsSuppressed(),
    ],
  ] as const)(
    'says why job alerts did not turn back on (%s)',
    async (code, status, message) => {
      const deps = dependencies();
      deps.updateEmailPreferences.mockRejectedValue(
        new BoardApiError({ status, code, message: code, raw: null }),
      );
      const off = {
        ...prefs,
        jobAlerts: { ...prefs.jobAlerts, unsubscribed: true },
      };
      deps.getEmailPreferences.mockResolvedValue(off);
      renderPage({ prefs: off }, deps);
      fireEvent.click(
        screen.getByRole('switch', { name: m.emailPreferences_jobAlertsAll() }),
      );
      expect(await screen.findByText(message())).toBeInTheDocument();
      expect(
        screen.queryByText(m.emailPreferences_actionError()),
      ).not.toBeInTheDocument();
    },
  );

  it('turning job alerts off never blames a confirmation email', async () => {
    const deps = dependencies();
    deps.updateEmailPreferences.mockRejectedValue(
      new BoardApiError({
        status: 429,
        code: 'rate_limited',
        message: 'rate_limited',
        raw: null,
      }),
    );
    deps.getEmailPreferences.mockResolvedValue(prefs);
    renderPage({}, deps);
    fireEvent.click(
      screen.getByRole('switch', { name: m.emailPreferences_jobAlertsAll() }),
    );
    expect(
      await screen.findByText(m.emailPreferences_actionError()),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(m.emailPreferences_jobAlertsThrottled()),
    ).not.toBeInTheDocument();
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
