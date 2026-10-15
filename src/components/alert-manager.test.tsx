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

import { alertFixture } from '../routes/-route-test-fixtures';

import type {
  AlertManagerDependencies,
  AlertPlaceOption,
} from './alert-manager';
import type { Alert } from '@cavuno/board';

const mocks = {
  createMyAlert: vi.fn<AlertManagerDependencies['createAlert']>(),
  deleteMyAlert: vi.fn<AlertManagerDependencies['deleteAlert']>(),
  invalidate: vi.fn<AlertManagerDependencies['invalidate']>(),
  updateMyAlert: vi.fn<AlertManagerDependencies['updateAlert']>(),
  toastActionSuccess: vi.fn(),
  toastActionError: vi.fn(),
  toastActionReconciliationError: vi.fn(),
};

import { m } from '../paraglide/messages';
import { AlertManagerView } from './alert-manager';

const alert = alertFixture({
  label: 'Frontend roles',
  filters: { jobFunctions: ['Engineering'], remoteOptions: ['remote'] },
});

const secondAlert = { ...alert, id: 'alert-2', label: 'Design roles' };

const berlin = {
  id: 'place-berlin',
  slug: 'berlin',
  name: 'Berlin',
  displayName: 'Berlin',
};

const searchAlert = alertFixture({
  id: 'alert-search',
  kind: 'search',
  filters: { query: 'react developer', remoteOptions: ['remote'] },
});

const similarJobAlert = alertFixture({
  id: 'alert-similar',
  kind: 'similar_job',
  anchorJob: { id: 'job-1', slug: 'senior-chef', title: 'Senior chef' },
  filters: { remoteOptions: ['remote'], placeIds: ['place-berlin'] },
});

interface RenderManagerOptions {
  alerts?: Alert[];
  places?: AlertPlaceOption[];
}

function managerView({ alerts = [], places = [] }: RenderManagerOptions) {
  return (
    <AlertManagerView
      alerts={alerts}
      places={places}
      dependencies={{
        createAlert: mocks.createMyAlert,
        deleteAlert: mocks.deleteMyAlert,
        updateAlert: mocks.updateMyAlert,
        invalidate: mocks.invalidate,
        notifySuccess: mocks.toastActionSuccess,
        notifyError: mocks.toastActionError,
        notifyReconciliationError: mocks.toastActionReconciliationError,
      }}
    />
  );
}

function renderManager(options: RenderManagerOptions = {}) {
  return render(managerView(options));
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
        .getByText(m.alertManager_emptyText())
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

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_newAlertLabel() }),
    );

    const form = document.querySelector('[data-test="alert-form"]');
    expect(form).not.toBeNull();
    expect(form?.closest('[data-slot="dialog-content"]')).not.toBeNull();
    expect(
      screen
        .getByLabelText(m.alertManager_nameLabel())
        .closest('[data-slot="field"]'),
    ).not.toBeNull();
    expect(
      screen.queryByLabelText(m.alertManager_frequencyLabel()),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('group', {
        name: m.alertManager_remoteOptionsLegend(),
      }),
    ).toHaveAttribute('data-slot', 'field-set');
  });

  it('opens editing in the owned right-hand sheet', () => {
    renderManager({ alerts: [alert] });

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_editLabel() }),
    );

    const form = document.querySelector('[data-test="alert-form"]');
    expect(form).not.toBeNull();
    const sheet = form?.closest('[data-slot="sheet-content"]');
    expect(sheet).not.toBeNull();
    expect(sheet).toHaveAttribute('data-side', 'right');
  });

  it('creates weekly alerts with every workplace type ticked by default', async () => {
    mocks.createMyAlert.mockResolvedValue(alert);
    renderManager();

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_newAlertLabel() }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_createAlertLabel() }),
    );

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
    mocks.createMyAlert.mockResolvedValue(alert);
    renderManager({ places: [berlin] });

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_newAlertLabel() }),
    );
    // Everything ticked by default → the location filter is offered already.
    fireEvent.click(
      screen.getByRole('checkbox', { name: m.alertManager_remoteOnSite() }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: m.alertManager_remoteHybrid() }),
    );

    const locations = screen.getByLabelText(m.alertManager_locationsLabel());
    fireEvent.change(locations, { target: { value: 'Ber' } });
    fireEvent.click(await screen.findByRole('option', { name: /Berlin/ }));

    expect(screen.getByText('Berlin')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_createAlertLabel() }),
    );
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
      name: m.alertManager_deleteLabel(),
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

  it('keeps a committed delete successful when refresh reconciliation fails', async () => {
    mocks.deleteMyAlert.mockResolvedValue({ ok: true });
    mocks.invalidate.mockRejectedValue(new Error('refresh unavailable'));
    renderManager({ alerts: [alert] });

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_deleteLabel() }),
    );

    await waitFor(() => {
      expect(mocks.toastActionSuccess).toHaveBeenCalledOnce();
      expect(mocks.toastActionReconciliationError).toHaveBeenCalledOnce();
      expect(
        screen.getByRole('button', { name: m.alertManager_deleteLabel() }),
      ).toBeEnabled();
    });
    expect(mocks.toastActionError).not.toHaveBeenCalled();
  });

  it('saves the keywords field as the alert search query', async () => {
    mocks.createMyAlert.mockResolvedValue(searchAlert);
    renderManager();

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_newAlertLabel() }),
    );
    fireEvent.change(screen.getByLabelText(m.alertManager_keywordsLabel()), {
      target: { value: '  react developer ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_createAlertLabel() }),
    );

    await waitFor(() =>
      expect(mocks.createMyAlert).toHaveBeenCalledWith({
        data: {
          frequency: 'weekly',
          query: 'react developer',
          remoteOptions: ['on_site', 'hybrid', 'remote'],
        },
      }),
    );
  });

  it('clears emptied keywords on edit and keeps job functions it does not show', async () => {
    mocks.updateMyAlert.mockResolvedValue(alert);
    renderManager({
      alerts: [{ ...alert, filters: { ...alert.filters, query: 'react' } }],
    });

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_editLabel() }),
    );
    const keywords = screen.getByLabelText(m.alertManager_keywordsLabel());
    expect(keywords).toHaveValue('react');
    fireEvent.change(keywords, { target: { value: '' } });
    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_saveChangesLabel() }),
    );

    await waitFor(() =>
      expect(mocks.updateMyAlert).toHaveBeenCalledWith({
        data: {
          id: 'alert-1',
          body: {
            frequency: 'weekly',
            label: 'Frontend roles',
            query: null,
            jobFunctions: ['Engineering'],
            remoteOptions: ['remote'],
          },
        },
      }),
    );
  });

  it('replaces an older search alert keyword with the new keywords', async () => {
    mocks.updateMyAlert.mockResolvedValue(searchAlert);
    renderManager({
      alerts: [
        {
          ...searchAlert,
          filters: {
            ...searchAlert.filters,
            query: null,
            jobFunctions: ['python'],
          },
        },
      ],
    });

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_editLabel() }),
    );
    fireEvent.change(screen.getByLabelText(m.alertManager_keywordsLabel()), {
      target: { value: 'python developer' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_saveChangesLabel() }),
    );

    await waitFor(() =>
      expect(mocks.updateMyAlert).toHaveBeenCalledWith({
        data: {
          id: 'alert-search',
          body: {
            frequency: 'weekly',
            query: 'python developer',
            remoteOptions: ['remote'],
          },
        },
      }),
    );
  });

  it('shows a search alert by its quoted keywords, or an older one by its job functions', () => {
    renderManager({
      alerts: [
        searchAlert,
        {
          ...searchAlert,
          id: 'alert-legacy',
          filters: {
            ...searchAlert.filters,
            query: null,
            jobFunctions: ['python'],
          },
        },
      ],
    });

    expect(
      screen.getByText(
        m.jobAlertMatch_quotedQuery({ query: 'react developer' }),
        { exact: false },
      ),
    ).toBeInTheDocument();
    // An older search alert kept its keyword as its job function.
    expect(
      screen.getByText(m.jobAlertMatch_quotedQuery({ query: 'python' }), {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(m.alertManager_searchAlertLabel())).toHaveLength(
      2,
    );
  });

  it('shows a similar-job alert by its job, delete only', () => {
    renderManager({
      alerts: [
        similarJobAlert,
        { ...similarJobAlert, id: 'alert-no-anchor', anchorJob: null },
      ],
      places: [berlin],
    });

    expect(
      screen.getByText(m.jobAlertMatch_similarTo({ title: 'Senior chef' })),
    ).toBeInTheDocument();
    // Without a captured anchor job it still reads as a similar-job alert.
    expect(
      screen.getAllByText(m.alertManager_similarJobsAlertLabel()),
    ).toHaveLength(3);
    // No location or keyword editing for a similar-job alert.
    expect(screen.queryByText(/Berlin/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: m.alertManager_editLabel() }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: m.alertManager_deleteLabel() }),
    ).toHaveLength(2);
  });

  it('keeps an earlier alert’s roles across edits that add keywords', async () => {
    const editAndSave = async (stored: Alert, change: () => void) => {
      mocks.updateMyAlert.mockResolvedValue(stored);
      renderManager({ alerts: [stored] });
      fireEvent.click(
        screen.getByRole('button', { name: m.alertManager_editLabel() }),
      );
      change();
      fireEvent.click(
        screen.getByRole('button', { name: m.alertManager_saveChangesLabel() }),
      );
      await waitFor(() => expect(mocks.updateMyAlert).toHaveBeenCalled());
      const body = mocks.updateMyAlert.mock.calls[0]![0].data.body;
      cleanup();
      vi.clearAllMocks();
      return body;
    };

    const filtersAlert = alertFixture({
      label: 'Frontend roles',
      filters: {
        jobFunctions: ['Engineering'],
        remoteOptions: ['on_site', 'remote'],
      },
    });
    const first = await editAndSave(filtersAlert, () =>
      fireEvent.change(screen.getByLabelText(m.alertManager_keywordsLabel()), {
        target: { value: 'react' },
      }),
    );
    expect(first).toMatchObject({
      query: 'react',
      jobFunctions: ['Engineering'],
    });

    // Stored as a search alert now; the next edit must not drop the role.
    const second = await editAndSave(
      alertFixture({
        ...filtersAlert,
        kind: 'search',
        filters: { ...filtersAlert.filters, query: 'react' },
      }),
      () =>
        fireEvent.click(
          screen.getByRole('checkbox', { name: m.alertManager_remoteOnSite() }),
        ),
    );
    expect(second).toEqual({
      frequency: 'weekly',
      label: 'Frontend roles',
      query: 'react',
      jobFunctions: ['Engineering'],
      remoteOptions: ['remote'],
    });
  });

  it('lets the subscriber remove an earlier alert’s roles', async () => {
    mocks.updateMyAlert.mockResolvedValue(alert);
    renderManager({ alerts: [alert] });

    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_editLabel() }),
    );
    expect(
      screen.getByRole('group', { name: m.alertManager_earlierRolesLabel() }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: m.placeTags_removeAriaLabel({ name: 'Engineering' }),
      }),
    );
    expect(
      screen.queryByRole('group', { name: m.alertManager_earlierRolesLabel() }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: m.alertManager_saveChangesLabel() }),
    );

    await waitFor(() =>
      expect(mocks.updateMyAlert).toHaveBeenCalledWith({
        data: {
          id: 'alert-1',
          body: {
            frequency: 'weekly',
            label: 'Frontend roles',
            query: null,
            remoteOptions: ['remote'],
          },
        },
      }),
    );
  });
});
