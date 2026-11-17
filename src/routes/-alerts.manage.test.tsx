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

import { ManagePageView } from './-alerts.manage';
import {
  createAlertManageLoader,
  type AlertManageDependencies,
  type ManageData,
  type ManageSearch,
} from './-alerts.manage-loader';

import { m } from '@/paraglide/messages';
import type { JobAlertManageState } from '@cavuno/board';

const invalidate = vi.fn<() => Promise<void>>();
const dependencies: AlertManageDependencies = {
  deleteJobAlertPreference: vi.fn(),
  getJobAlertManageState: vi.fn(),
  getAnchorJobPaths: vi.fn(),
  getSeoBase: vi.fn(),
  keepJobAlertManageLink: vi.fn(),
  resubscribeJobAlert: vi.fn(),
  unsubscribeJobAlert: vi.fn(),
};

const state = {
  object: 'job_alert_manage_state',
  email: 'candidate@example.com',
  confirmed: true,
  unsubscribed: false,
  preferences: [
    {
      id: 'preference-1',
      label: 'Design jobs',
      frequency: 'weekly',
      isActive: true,
      kind: 'filters',
      anchorJob: null,
      filters: {},
      manageToken: 'preference-token',
    },
  ],
} satisfies JobAlertManageState;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const LINK = '0123456789abcdef';
const kept: ManageSearch = { link: LINK };

function renderManage(data: ManageData, search: ManageSearch = {}) {
  render(
    <ManagePageView
      data={data}
      search={search}
      invalidate={invalidate}
      dependencies={dependencies}
    />,
  );
}

/** Runs the loader, returning the redirect it throws, if any. */
async function loadManage(deps: ManageSearch) {
  vi.mocked(dependencies.getSeoBase).mockResolvedValue({ boardName: 'Board' });
  try {
    return { data: await createAlertManageLoader(dependencies)({ deps }) };
  } catch (error) {
    if (!isRedirect(error)) throw error;
    return { redirect: error.options };
  }
}

describe('public job-alert management', () => {
  it('uses the owned Empty composition for an invalid manage link', () => {
    renderManage({ error: true });

    expect(
      screen
        .getByText(m.alertsManage_invalidTitle())
        .closest('[data-slot="empty"]'),
    ).not.toBeNull();
  });

  it('uses the owned Alert composition for the unsubscribed state', () => {
    renderManage(
      { state: { ...state, unsubscribed: true }, anchorJobPaths: {} },
      kept,
    );

    expect(
      screen
        .getByText(m.alertsManage_unsubscribedText())
        .closest('[data-slot="alert"]'),
    ).not.toBeNull();
  });

  it('uses the owned Item composition for each alert preference', () => {
    renderManage({ state, anchorJobPaths: {} }, kept);

    const item = screen
      .getByText(m.alertsManage_allJobsText())
      .closest('[data-slot="item"]');
    expect(item).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-content"]')).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-actions"]')).not.toBeNull();
  });

  it('turns a rejected unsubscribe into visible, recoverable feedback', async () => {
    vi.mocked(dependencies.unsubscribeJobAlert).mockRejectedValue(
      new Error('unsubscribe unavailable'),
    );
    invalidate.mockResolvedValue();
    renderManage({ state, anchorJobPaths: {} }, kept);
    fireEvent.click(
      screen.getByRole('button', {
        name: m.alertsManage_unsubscribeAllLabel(),
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'alert');
      expect(screen.getByRole('alert')).toHaveTextContent(
        m.alertsManage_actionErrorText(),
      );
      expect(
        screen.getByRole('button', {
          name: m.alertsManage_unsubscribeAllLabel(),
        }),
      ).toBeEnabled();
    });
    // The state is read again, so an expired link shows its notice.
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it('reports a committed unsubscribe as saved when refresh fails', async () => {
    vi.mocked(dependencies.unsubscribeJobAlert).mockResolvedValue({
      object: 'job_alert_manage_result',
      success: true,
    });
    invalidate.mockRejectedValue(new Error('refresh unavailable'));
    renderManage({ state, anchorJobPaths: {} }, kept);

    fireEvent.click(
      screen.getByRole('button', {
        name: m.alertsManage_unsubscribeAllLabel(),
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        m.candidateAction_reconciliationError(),
      );
    });
    expect(dependencies.unsubscribeJobAlert).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      m.alertsManage_actionErrorText(),
    );
  });

  it('shows the no-alerts state, not the invalid link, once every alert is deleted', async () => {
    vi.mocked(dependencies.getJobAlertManageState).mockResolvedValue(null);
    const { data } = await loadManage(kept);
    expect(data).toMatchObject({ empty: true });

    renderManage(data!, kept);
    expect(screen.getByText(m.alertsManage_emptyTitle())).toBeInTheDocument();
    expect(screen.queryByText(m.alertsManage_invalidTitle())).toBeNull();
  });

  it('keeps the link in a cookie and opens the page with only its key', async () => {
    vi.mocked(dependencies.keepJobAlertManageLink).mockResolvedValue(LINK);
    const { redirect } = await loadManage({
      subscription: 'subscription-1',
      token: 'subscription-token',
      unsubscribe: true,
    });

    expect(dependencies.keepJobAlertManageLink).toHaveBeenCalledWith({
      data: { subscription: 'subscription-1', token: 'subscription-token' },
    });
    expect(redirect).toMatchObject({
      to: '/alerts/manage',
      search: { link: LINK, unsubscribe: true },
    });
    expect(dependencies.unsubscribeJobAlert).not.toHaveBeenCalled();
  });

  it('opens a malformed link with no key, so the page says it is invalid', async () => {
    vi.mocked(dependencies.keepJobAlertManageLink).mockResolvedValue(null);
    const { redirect } = await loadManage({
      subscription: 'subscription-1',
      token: 'bad;token',
    });

    expect(redirect).toMatchObject({ search: {} });
  });

  it('opening the unsubscribe link only reads; the click unsubscribes', async () => {
    vi.mocked(dependencies.getJobAlertManageState).mockResolvedValue(state);
    const { data } = await loadManage({ link: LINK, unsubscribe: true });
    expect(dependencies.getJobAlertManageState).toHaveBeenCalledWith({
      data: { link: LINK },
    });
    for (const write of [
      dependencies.unsubscribeJobAlert,
      dependencies.resubscribeJobAlert,
      dependencies.deleteJobAlertPreference,
    ]) {
      expect(write).not.toHaveBeenCalled();
    }

    vi.mocked(dependencies.unsubscribeJobAlert).mockResolvedValue({
      object: 'job_alert_manage_result',
      success: true,
    });
    invalidate.mockResolvedValue();
    renderManage(data!, { link: LINK, unsubscribe: true });
    expect(dependencies.unsubscribeJobAlert).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', {
        name: m.alertsManage_unsubscribeAllLabel(),
      }),
    );
    await waitFor(() => expect(invalidate).toHaveBeenCalledOnce());
    expect(dependencies.unsubscribeJobAlert).toHaveBeenCalledExactlyOnceWith({
      data: { link: LINK },
    });
  });

  it('shows only the unsubscribed line when the link is already off', () => {
    renderManage(
      { state: { ...state, unsubscribed: true }, anchorJobPaths: {} },
      { link: LINK, unsubscribe: true },
    );

    expect(
      screen.getByText(m.alertsManage_unsubscribedText()),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: m.alertsManage_unsubscribeAllLabel(),
      }),
    ).toBeNull();
    expect(dependencies.unsubscribeJobAlert).not.toHaveBeenCalled();
  });

  it('says to use a recent email once the kept link has expired', async () => {
    vi.mocked(dependencies.getJobAlertManageState).mockResolvedValue(
      'link_expired',
    );
    const { data } = await loadManage(kept);

    expect(data).toMatchObject({ error: true });
  });

  it('names a similar-job alert’s job and quotes a search alert’s keywords', () => {
    renderManage(
      {
        state: {
          ...state,
          preferences: [
            {
              ...state.preferences[0],
              id: 'preference-similar',
              kind: 'similar_job',
              anchorJob: {
                id: 'job-1',
                slug: 'senior-chef',
                title: 'Senior chef',
              },
              filters: { placeIds: ['place-berlin'] },
            },
            {
              ...state.preferences[0],
              id: 'preference-search',
              kind: 'search',
              filters: { query: 'python', remoteOptions: ['remote'] },
            },
          ],
        },
        anchorJobPaths: {},
      },
      kept,
    );

    // Without a resolved job link the title shows as plain text.
    expect(
      screen.getByText(m.jobAlertMatch_similarTo({ title: 'Senior chef' })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(m.jobAlertMatch_quotedQuery({ query: 'python' }), {
        exact: false,
      }),
    ).toBeInTheDocument();
  });
});
