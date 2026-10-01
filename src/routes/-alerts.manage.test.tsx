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

import { ManagePageView, type AlertManageDependencies } from './-alerts.manage';

import { m } from '@/paraglide/messages';
import type { JobAlertManageState } from '@cavuno/board';

const invalidate = vi.fn<() => Promise<void>>();
const dependencies: AlertManageDependencies = {
  deleteJobAlertPreference: vi.fn(),
  getJobAlertManageState: vi.fn(),
  getSeoBase: vi.fn(),
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
      filters: {},
      manageToken: 'preference-token',
    },
  ],
} satisfies JobAlertManageState;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderManage(
  data: { state: JobAlertManageState } | { error: true },
  search: { subscription?: string; token?: string } = {},
) {
  render(
    <ManagePageView
      data={data}
      search={search}
      invalidate={invalidate}
      dependencies={dependencies}
    />,
  );
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
      { state: { ...state, unsubscribed: true } },
      { subscription: 'subscription-1', token: 'subscription-token' },
    );

    expect(
      screen
        .getByText(m.alertsManage_unsubscribedText())
        .closest('[data-slot="alert"]'),
    ).not.toBeNull();
  });

  it('uses the owned Item composition for each alert preference', () => {
    renderManage(
      { state },
      { subscription: 'subscription-1', token: 'subscription-token' },
    );

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
    renderManage(
      { state },
      { subscription: 'subscription-1', token: 'subscription-token' },
    );
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
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('reports a committed unsubscribe as saved when refresh fails', async () => {
    vi.mocked(dependencies.unsubscribeJobAlert).mockResolvedValue({
      object: 'job_alert_manage_result',
      success: true,
    });
    invalidate.mockRejectedValue(new Error('refresh unavailable'));
    renderManage(
      { state },
      { subscription: 'subscription-1', token: 'subscription-token' },
    );

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
});
