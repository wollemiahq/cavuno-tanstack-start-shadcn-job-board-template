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

import type { Alert } from '@cavuno/board';

const mocks = vi.hoisted(() => ({
  createMyAlert: vi.fn<() => unknown>(),
  deleteMyAlert: vi.fn<() => unknown>(),
  invalidate: vi.fn<() => unknown>(),
  updateMyAlert: vi.fn<() => unknown>(),
  toastActionSuccess: vi.fn<() => unknown>(),
  toastActionError: vi.fn<() => unknown>(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useRouter: () => ({ invalidate: mocks.invalidate }) };
});

vi.mock('../server/account', () => ({
  createMyAlert: mocks.createMyAlert,
  deleteMyAlert: mocks.deleteMyAlert,
  updateMyAlert: mocks.updateMyAlert,
}));

vi.mock('@/lib/action-toast', () => ({
  toastActionSuccess: mocks.toastActionSuccess,
  toastActionError: mocks.toastActionError,
}));

import { AlertManager } from './alert-manager';

const alert = {
  id: 'alert-1',
  object: 'alert',
  label: 'Frontend roles',
  frequency: 'weekly',
  isActive: true,
  filters: {
    jobFunctions: ['Engineering'],
    seniorityLevels: [],
    remoteOptions: ['remote'],
    placeIds: [],
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
  },
  lastSentAt: null,
} satisfies Alert;

const secondAlert = {
  ...alert,
  id: 'alert-2',
  label: 'Design roles',
} satisfies Alert;

const berlin = { id: 'place-berlin', slug: 'berlin', name: 'Berlin' };

function renderManager({
  alerts = [] as Alert[],
  places = [] as { id: string; slug: string | null; name: string }[],
} = {}) {
  return render(<AlertManager alerts={alerts} places={places} />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AlertManager', () => {
  it('uses the owned Empty composition when there are no alerts', () => {
    renderManager();

    expect(
      screen
        .getByText('You have no job alerts yet.')
        .closest('[data-slot="empty"]'),
    ).not.toBeNull();
  });

  it('uses the owned Item composition for each saved alert', () => {
    renderManager({ alerts: [alert] });

    const item = screen
      .getByText('Frontend roles')
      .closest('[data-slot="item"]');
    expect(item).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-content"]')).not.toBeNull();
    expect(item?.querySelector('[data-slot="item-actions"]')).not.toBeNull();
  });

  it('opens creation in the owned dialog with Field compositions', () => {
    renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'New alert' }));

    const form = document.querySelector('[data-test="alert-form"]');
    expect(form).not.toBeNull();
    expect(form?.closest('[data-slot="dialog-content"]')).not.toBeNull();
    expect(
      screen.getByLabelText('Name (optional)').closest('[data-slot="field"]'),
    ).not.toBeNull();
    expect(screen.queryByLabelText('Frequency')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Workplace' })).toHaveAttribute(
      'data-slot',
      'field-set',
    );
  });

  it('opens editing in the owned right-hand sheet', () => {
    renderManager({ alerts: [alert] });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    const form = document.querySelector('[data-test="alert-form"]');
    expect(form).not.toBeNull();
    const sheet = form?.closest('[data-slot="sheet-content"]');
    expect(sheet).not.toBeNull();
    expect(sheet).toHaveAttribute('data-side', 'right');
  });

  it('creates weekly alerts with every workplace type ticked by default', async () => {
    mocks.createMyAlert.mockResolvedValue(undefined);
    renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'New alert' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create alert' }));

    await waitFor(() =>
      expect(mocks.createMyAlert).toHaveBeenCalledWith({
        data: {
          frequency: 'weekly',
          remoteOptions: ['on_site', 'hybrid', 'remote'],
        },
      }),
    );
  });

  it('narrows workplace types and ties the alert to picked locations', async () => {
    mocks.createMyAlert.mockResolvedValue(undefined);
    renderManager({ places: [berlin] });

    fireEvent.click(screen.getByRole('button', { name: 'New alert' }));
    // Everything ticked by default → the location filter is offered already.
    fireEvent.click(screen.getByRole('checkbox', { name: 'On-site' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hybrid' }));

    const locations = screen.getByLabelText('Locations');
    fireEvent.change(locations, { target: { value: 'Ber' } });
    fireEvent.click(await screen.findByRole('option', { name: /Berlin/ }));

    expect(screen.getByText('Berlin')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create alert' }));
    await waitFor(() =>
      expect(mocks.createMyAlert).toHaveBeenCalledWith({
        data: {
          frequency: 'weekly',
          remoteOptions: ['remote'],
          placeIds: ['place-berlin'],
        },
      }),
    );
  });

  it('resolves stored place ids to names in the alert summary', () => {
    renderManager({
      alerts: [
        {
          ...alert,
          filters: { ...alert.filters, placeIds: ['place-berlin'] },
        },
      ],
      places: [berlin],
    });

    expect(screen.getByText(/Berlin/)).toBeInTheDocument();
  });

  it('prevents duplicate deletes, then shows a retryable error without invalidating', async () => {
    let rejectDelete: (error: Error) => void = () => undefined;
    mocks.deleteMyAlert.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectDelete = reject;
        }),
    );
    renderManager({ alerts: [alert, secondAlert] });

    const [deleteButton, otherDeleteButton] = screen.getAllByRole('button', {
      name: 'Delete',
    });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    expect(mocks.deleteMyAlert).toHaveBeenCalledTimes(1);
    expect(deleteButton).toBeDisabled();
    expect(otherDeleteButton).toBeDisabled();

    rejectDelete(new Error('network unavailable'));

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(deleteButton).toBeEnabled();
    });
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
