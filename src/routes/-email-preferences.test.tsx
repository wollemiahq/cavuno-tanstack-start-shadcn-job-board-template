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

// A plain anchor in place of the router's Link: these render without one.
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ to, ...props }: { to: string } & React.ComponentProps<'a'>) => (
    <a href={to} {...props} />
  ),
}));

import { EmailPreferencesPageView } from './-email-preferences';
import {
  createEmailPreferencesLoader,
  emailPreferencesHead,
  type EmailPreferencesData,
  type EmailPreferencesDependencies,
} from './-email-preferences-loader';

import { m } from '@/paraglide/messages';
import type {
  EmailPreferences,
  EmailPreferencesUpdateResult,
} from '@cavuno/board';

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
  jobMatchesOffered: false,
  marketing: { subscribed: false },
  topics: [
    { key: 'events', name: 'Events', subscribed: true },
    { key: 'salary-reports', name: 'Salary reports', subscribed: false },
  ],
} satisfies EmailPreferences;

/** What a change returns: the preferences, and whether it emailed a link. */
function updated(
  next: EmailPreferences,
  confirmationEmailQueued = false,
): EmailPreferencesUpdateResult {
  return { ...next, confirmationEmailQueued };
}

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

/** The row of the alert with this name. */
function alertRow(label: string) {
  const row = alertActions(label).closest('[data-slot="field"]');
  expect(row).toBeInstanceOf(HTMLElement);
  // SAFETY: checked to be an HTMLElement on the line above.
  return row as HTMLElement;
}

/** The switch of the alert with this name. */
function alertSwitch(label: string) {
  return within(alertRow(label)).getByRole('switch');
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
    deps.updateEmailPreferences.mockResolvedValue(
      updated({ ...prefs, marketing: { subscribed: true } }),
    );
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
    deps.updateEmailPreferences.mockResolvedValue(updated(marketingOn));
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
    deps.updateEmailPreferences.mockResolvedValue(
      updated({ ...prefs, jobAlerts: { ...prefs.jobAlerts, alerts: [] } }),
    );
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

  it('gives each alert its own switch, off while paused, under the Email me new jobs switch', () => {
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
    const card = screen.getByRole('region', {
      name: m.emailPreferences_jobEmailsTitle(),
    });
    expect(within(card).getAllByRole('switch')).toEqual([
      screen.getByRole('switch', { name: m.emailPreferences_jobEmailsAll() }),
      alertSwitch('Design jobs'),
      alertSwitch('Ops jobs'),
    ]);
    expect(
      screen.getByRole('switch', { name: m.emailPreferences_jobEmailsAll() }),
    ).toBeChecked();
    expect(alertSwitch('Design jobs')).not.toBeChecked();
    expect(alertSwitch('Ops jobs')).toBeChecked();
  });

  it('with job alerts off, turning one alert on brings back only that one', async () => {
    const deps = dependencies();
    const off = {
      ...prefs,
      jobAlerts: {
        ...prefs.jobAlerts,
        unsubscribed: true,
        alerts: [
          prefs.jobAlerts.alerts[0],
          { ...prefs.jobAlerts.alerts[0], id: 'alert-2', label: 'Ops jobs' },
        ],
      },
    };
    deps.updateEmailPreferences.mockResolvedValue(updated(off));
    renderPage({ prefs: off }, deps);
    expect(
      screen.getByRole('switch', { name: m.emailPreferences_jobEmailsAll() }),
    ).not.toBeChecked();
    expect(alertSwitch('Design jobs')).not.toBeChecked();
    expect(alertSwitch('Ops jobs')).not.toBeChecked();

    fireEvent.click(alertSwitch('Design jobs'));
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
        data: {
          person: PERSON,
          changes: {
            jobAlerts: true,
            alerts: [
              { id: 'alert-1', paused: false },
              { id: 'alert-2', paused: true },
            ],
          },
        },
      }),
    );
  });

  it('Email me new jobs turns every source off at once, and back on resumes them', async () => {
    const deps = dependencies();
    const on = {
      ...prefs,
      jobMatches: { subscribed: true, waitlisted: false },
    };
    deps.updateEmailPreferences.mockResolvedValue(updated(on));
    renderPage({ prefs: on }, deps);
    fireEvent.click(
      screen.getByRole('switch', { name: m.emailPreferences_jobEmailsAll() }),
    );
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
        data: {
          person: PERSON,
          changes: { jobAlerts: false, jobMatches: false },
        },
      }),
    );
    cleanup();

    // Every alert paused and matches off: on resumes them, so on sends.
    const allPaused = {
      ...prefs,
      jobAlerts: {
        ...prefs.jobAlerts,
        alerts: [{ ...prefs.jobAlerts.alerts[0], paused: true }],
      },
      jobMatches: { subscribed: false, waitlisted: false },
    };
    const deps2 = dependencies();
    deps2.updateEmailPreferences.mockResolvedValue(updated(allPaused));
    renderPage({ prefs: allPaused }, deps2);
    const all = screen.getByRole('switch', {
      name: m.emailPreferences_jobEmailsAll(),
    });
    expect(all).not.toBeChecked();
    fireEvent.click(all);
    await waitFor(() =>
      expect(deps2.updateEmailPreferences).toHaveBeenCalledWith({
        data: {
          person: PERSON,
          changes: {
            alerts: [{ id: 'alert-1', paused: false }],
            jobMatches: true,
          },
        },
      }),
    );
  });

  it('titles each alert with the sentence its digest uses, with its other filters and no cadence', async () => {
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
    const search = alertRow(
      m.emailPreferences_alertNear({
        jobs: m.jobAlertMatch_jobsMatching({ query: 'pilot' }),
        place: 'Berlin',
      }),
    );
    expect(within(search).getByText('Flight operations')).toBeInTheDocument();
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

  it('names a place once, in the title, and adds no filler line to a keyword-only alert', () => {
    const base = { ...prefs.jobAlerts.alerts[0], label: null };
    renderPage({
      prefs: {
        ...prefs,
        jobAlerts: {
          ...prefs.jobAlerts,
          alerts: [
            { ...base, id: 'alert-keyword', filters: { query: 'pilot' } },
            {
              ...base,
              id: 'alert-place',
              filters: { query: 'cabin crew', placeIds: ['place-berlin'] },
            },
          ],
        },
      },
      filterNames: { categories: {}, places: { 'place-berlin': 'Berlin' } },
    });
    expect(
      screen.queryByText(m.jobAlertMatch_anyCriteria()),
    ).not.toBeInTheDocument();
    const placed = alertRow(
      m.emailPreferences_alertNear({
        jobs: m.jobAlertMatch_jobsMatching({ query: 'cabin crew' }),
        place: 'Berlin',
      }),
    );
    expect(within(placed).queryByText('Berlin')).not.toBeInTheDocument();
  });

  it('a person who never confirmed can only delete an alert, or turn it on for a fresh link', async () => {
    renderPage({
      prefs: {
        ...prefs,
        jobAlerts: { ...prefs.jobAlerts, confirmed: false },
      },
    });
    expect(alertSwitch('Design jobs')).toHaveAttribute('aria-disabled', 'true');
    expect(await openAlertMenu('Design jobs')).toEqual([
      m.emailPreferences_deleteAlert(),
    ]);
  });

  it('keeps the menu button focusable while a change saves, with its items waiting', async () => {
    const deps = dependencies();
    let finish: (value: EmailPreferencesUpdateResult) => void = () => {};
    deps.updateEmailPreferences.mockReturnValue(
      new Promise<EmailPreferencesUpdateResult>((resolve) => {
        finish = resolve;
      }),
    );
    renderPage({}, deps);
    fireEvent.click(alertSwitch('Design jobs'));
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledTimes(1),
    );
    expect(alertSwitch('Design jobs')).toHaveAttribute('aria-disabled', 'true');
    expect(alertActions('Design jobs')).toBeEnabled();
    await openAlertMenu('Design jobs');
    for (const item of screen.getAllByRole('menuitem')) {
      expect(item).toHaveAttribute('aria-disabled', 'true');
    }
    fireEvent.click(
      screen.getByRole('menuitem', { name: m.emailPreferences_deleteAlert() }),
    );
    expect(deps.updateEmailPreferences).toHaveBeenCalledTimes(1);
    finish(updated(prefs));
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
    // On, waiting for its link: nothing to switch until it is clicked.
    expect(alertSwitch('Design jobs')).toBeChecked();
    expect(alertSwitch('Design jobs')).toHaveAttribute('aria-disabled', 'true');
    expect(await openAlertMenu('Design jobs')).toEqual([
      m.emailPreferences_deleteAlert(),
    ]);
  });

  it('tells an alert waiting for its link to turn it on while job alerts are off', () => {
    renderPage({
      prefs: {
        ...prefs,
        jobAlerts: {
          ...prefs.jobAlerts,
          unsubscribed: true,
          alerts: [
            { ...prefs.jobAlerts.alerts[0], awaitingConfirmation: true },
          ],
        },
      },
    });
    const row = within(alertRow('Design jobs'));
    expect(
      row.getByText(m.emailPreferences_alertAwaitingJobAlertsOff()),
    ).toBeInTheDocument();
    expect(
      row.queryByText(m.emailPreferences_alertAwaiting()),
    ).not.toBeInTheDocument();
    expect(alertSwitch('Design jobs')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    'the switch of an alert with paused=%s sends paused=%s for only that alert',
    async (paused, next) => {
      const deps = dependencies();
      const before = {
        ...prefs,
        jobAlerts: {
          ...prefs.jobAlerts,
          alerts: [{ ...prefs.jobAlerts.alerts[0], paused }],
        },
      };
      deps.updateEmailPreferences.mockResolvedValue(updated(before));
      renderPage({ prefs: before }, deps);
      expect(alertSwitch('Design jobs')).toHaveAttribute(
        'aria-checked',
        String(!paused),
      );
      fireEvent.click(alertSwitch('Design jobs'));
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

  it.each([
    [true, true],
    [false, false],
  ])(
    'turning job alerts back on says a link is on its way only when the API queued one (queued=%s)',
    async (queued, shown) => {
      const deps = dependencies();
      // Both answers leave the alert waiting for its link: only the API
      // knows whether this change emailed one.
      deps.updateEmailPreferences.mockResolvedValue(
        updated(
          {
            ...prefs,
            jobAlerts: {
              ...prefs.jobAlerts,
              alerts: [
                { ...prefs.jobAlerts.alerts[0], awaitingConfirmation: true },
              ],
            },
          },
          queued,
        ),
      );
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
        screen.getByRole('switch', { name: m.emailPreferences_jobEmailsAll() }),
      );
      await waitFor(() =>
        expect(
          screen.getByRole('switch', {
            name: m.emailPreferences_jobEmailsAll(),
          }),
        ).toBeChecked(),
      );
      expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
        data: { person: PERSON, changes: { jobAlerts: true } },
      });
      expect(
        screen.queryByText(m.emailPreferences_jobAlertsLinkSent()) !== null,
      ).toBe(shown);
    },
  );

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
        screen.getByRole('switch', { name: m.emailPreferences_jobEmailsAll() }),
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
      screen.getByRole('switch', { name: m.emailPreferences_jobEmailsAll() }),
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
        name: m.emailPreferences_jobMatchesRow(),
      }),
    ).not.toBeInTheDocument();
    cleanup();

    const deps = dependencies();
    deps.updateEmailPreferences.mockResolvedValue(updated(prefs));
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
        name: m.emailPreferences_jobMatchesRow(),
      }),
    );
    await waitFor(() =>
      expect(deps.updateEmailPreferences).toHaveBeenCalledWith({
        data: { person: PERSON, changes: { jobMatches: false } },
      }),
    );
  });

  it('links a person without job matches to set them up only when the board offers them', () => {
    renderPage({});
    expect(
      screen.queryByRole('link', {
        name: m.emailPreferences_jobMatchesSetup(),
      }),
    ).not.toBeInTheDocument();
    cleanup();

    // Until the SDK types it, the field rides along on the API's answer.
    const offered = { ...prefs, jobMatchesOffered: true };
    renderPage({ prefs: offered });
    expect(
      screen.getByRole('link', { name: m.emailPreferences_jobMatchesSetup() }),
    ).toHaveAttribute('href', '/matches');
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
