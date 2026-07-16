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

import type { JobAlertManageState } from '@cavuno/board';

const mocks = vi.hoisted(() => ({
  deleteJobAlertPreference: vi.fn<() => unknown>(),
  getJobAlertManageState: vi.fn<() => unknown>(),
  invalidate: vi.fn<() => unknown>(),
  resubscribeJobAlert: vi.fn<() => unknown>(),
  unsubscribeJobAlert: vi.fn<() => unknown>(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useRouter: () => ({ invalidate: mocks.invalidate }) };
});

vi.mock('../server/queries', () => ({
  deleteJobAlertPreference: mocks.deleteJobAlertPreference,
  getJobAlertManageState: mocks.getJobAlertManageState,
  resubscribeJobAlert: mocks.resubscribeJobAlert,
  unsubscribeJobAlert: mocks.unsubscribeJobAlert,
}));

import { Route } from './alerts.manage';

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
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('public job-alert management', () => {
  it('uses the owned Empty composition for an invalid manage link', () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({ error: true });
    vi.spyOn(Route, 'useSearch').mockReturnValue({});
    const ManagePage = Route.options.component;
    if (!ManagePage)
      throw new Error('The manage-alerts route needs a component');

    render(<ManagePage />);

    expect(
      screen.getByText('Manage link invalid').closest('[data-slot="empty"]'),
    ).not.toBeNull();
  });

  it('uses the owned Alert composition for the unsubscribed state', () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      state: { ...state, unsubscribed: true },
    });
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      subscription: 'subscription-1',
      token: 'subscription-token',
    });
    const ManagePage = Route.options.component;
    if (!ManagePage)
      throw new Error('The manage-alerts route needs a component');

    render(<ManagePage />);

    expect(
      screen
        .getByText("You're unsubscribed from all job alerts.")
        .closest('[data-slot="alert"]'),
    ).not.toBeNull();
  });

  it('uses the owned Item composition for each alert preference', () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({ state });
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      subscription: 'subscription-1',
      token: 'subscription-token',
    });
    const ManagePage = Route.options.component;
    if (!ManagePage)
      throw new Error('The manage-alerts route needs a component');

    render(<ManagePage />);

    const item = screen.getByText('All jobs').closest('[data-slot="item"]');
    expect(item).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-content"]')).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-actions"]')).not.toBeNull();
  });

  it('turns a rejected unsubscribe into visible, recoverable feedback', async () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({ state });
    vi.spyOn(Route, 'useSearch').mockReturnValue({
      subscription: 'subscription-1',
      token: 'subscription-token',
    });
    mocks.unsubscribeJobAlert.mockRejectedValue(
      new Error('unsubscribe unavailable'),
    );
    const ManagePage = Route.options.component;
    if (!ManagePage)
      throw new Error('The manage-alerts route needs a component');

    render(<ManagePage />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Unsubscribe from all alerts' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'alert');
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Try again.',
      );
      expect(
        screen.getByRole('button', { name: 'Unsubscribe from all alerts' }),
      ).toBeEnabled();
    });
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
