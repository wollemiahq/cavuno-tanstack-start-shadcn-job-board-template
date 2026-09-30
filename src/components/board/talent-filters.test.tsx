// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
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
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TalentFilters } from './talent-filters';

import type { CustomFilterField } from '@/lib/custom-field-filters';
import { parseTalentSearch } from '@/lib/talent-search';
import { m } from '@/paraglide/messages';
import { containing } from '@/test/text';

afterEach(cleanup);

/** Matches an accessible name that contains the catalog label. */
const statusCombobox = { name: m.talentFilters_statusLabel() };
const sortCombobox = { name: m.jobSearch_sortPlaceholder() };
const resetButton = { name: m.jobSearch_resetLabel() };
const allFiltersButton = { name: containing(m.jobSearch_allFiltersLabel()) };

const mentoring: CustomFilterField = {
  kind: 'flag',
  key: 'open_to_mentoring',
  label: 'Open to mentoring',
};
const availability: CustomFilterField = {
  kind: 'choice',
  key: 'availability',
  label: 'Availability',
  options: [
    { value: 'now', label: 'Immediately' },
    { value: 'month', label: 'Within a month' },
  ],
};

function renderFilters(search = '', customFilterFields?: CustomFilterField[]) {
  const rootRoute = createRootRoute();
  const talentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/talent/',
    validateSearch: parseTalentSearch,
    component: () => {
      const current = talentRoute.useSearch();
      return (
        <TalentFilters
          search={current}
          customFilterFields={customFilterFields}
        />
      );
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([talentRoute]),
    history: createMemoryHistory({
      initialEntries: [search ? `/talent/${search}` : '/talent/'],
    }),
  });

  return {
    ...render(<RouterProvider router={router} />),
    router,
  };
}

describe('TalentFilters', () => {
  it('renders status, relocate, and sort without a keyword Search field', async () => {
    const { container } = renderFilters();

    const status = await screen.findByRole('combobox', statusCombobox);
    const relocate = screen.getByRole('combobox', {
      name: m.talentFilters_relocateLabel(),
    });
    expect(status).toHaveTextContent(m.talentFilters_anyStatusOption());
    expect(relocate).toHaveTextContent(m.talentFilters_anyRelocateOption());
    const sort = screen.getByRole('combobox', sortCombobox);
    expect(sort).toHaveTextContent(`${m.jobSearch_sortPlaceholder()}:`);
    expect(sort).toHaveTextContent(m.talentFilters_sortBestMatch());
    expect(
      container.querySelector("[data-slot='talent-filter-bar']"),
    ).not.toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(
      screen.queryByPlaceholderText(m.talentFilters_queryPlaceholder()),
    ).toBeNull();
    expect(screen.queryByLabelText(m.talentFilters_queryLabel())).toBeNull();
  });

  it('describes the Filters sheet as candidate filters, not job results', async () => {
    renderFilters();

    fireEvent.click(
      await screen.findByRole('button', { name: m.jobSearch_filtersLabel() }),
    );
    const sheet = screen.getByRole('dialog', {
      name: m.jobSearch_filtersLabel(),
    });
    expect(sheet).toHaveTextContent(m.talentFilters_filterSheetDescription());
    for (const absent of [
      m.talentFilters_skillLabel(),
      m.talentFilters_languagesLabel(),
      m.talentFilters_seniorityLabel(),
      m.talentFilters_permitCountryLabel(),
      m.talentFilters_interestedRoleLabel(),
      m.jobSearch_filterSheetDescription(),
      m.jobSearch_filterSheetDescriptionWithCustomFields(),
    ]) {
      expect(sheet).not.toHaveTextContent(absent);
    }
  });

  it('keeps a job-bound interestedRole when status changes', async () => {
    const { router } = renderFilters('?interestedRole=Robotics%20Engineer');

    fireEvent.click(await screen.findByRole('combobox', statusCombobox));
    const active = screen.getByRole('option', {
      name: m.talentFilters_statusActive(),
    });
    fireEvent.pointerDown(active, { pointerType: 'mouse' });
    fireEvent.click(active);

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        interestedRole: 'Robotics Engineer',
        jobSearchStatus: 'actively_looking',
      }),
    );
  });

  it('keeps a job-bound interestedRole when Reset clears status', async () => {
    const { router } = renderFilters(
      '?interestedRole=Robotics%20Engineer&jobSearchStatus=actively_looking',
    );

    fireEvent.click(await screen.findByRole('button', resetButton));

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        interestedRole: 'Robotics Engineer',
      }),
    );
    expect(router.state.location.search).not.toHaveProperty('jobSearchStatus');
  });

  it('writes sort to the URL immediately', async () => {
    const { router } = renderFilters();

    fireEvent.click(await screen.findByRole('combobox', sortCombobox));
    const newest = screen.getByRole('option', {
      name: m.talentFilters_sortNewest(),
    });
    fireEvent.pointerDown(newest, { pointerType: 'mouse' });
    fireEvent.click(newest);

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ sort: 'newest' }),
    );
  });

  it('has no All filters button without filterable profile fields', async () => {
    renderFilters();

    await screen.findByRole('combobox', statusCombobox);
    expect(screen.queryByRole('button', allFiltersButton)).toBeNull();
  });

  it('adds candidate profile fields to the sheet and writes cf.* on Apply', async () => {
    const { router } = renderFilters('?jobSearchStatus=actively_looking', [
      mentoring,
      availability,
    ]);

    fireEvent.click(await screen.findByRole('button', allFiltersButton));
    const sheet = screen.getByRole('dialog', {
      name: m.jobSearch_allFiltersLabel(),
    });
    expect(sheet).toHaveAccessibleDescription(
      m.talentFilters_filterSheetDescriptionWithCustomFields(),
    );
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Open to mentoring' }),
    );
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Within a month' }),
    );
    fireEvent.click(
      within(sheet).getByRole('button', {
        name: m.jobSearch_applyFiltersLabel(),
      }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        jobSearchStatus: 'actively_looking',
        'cf.open_to_mentoring': true,
        'cf.availability': 'month',
      }),
    );
  });

  it('counts active profile-field filters and clears them on Reset', async () => {
    const { router } = renderFilters(
      '?cf.open_to_mentoring=true&cf.availability=now,retired',
      [mentoring, availability],
    );

    const trigger = await screen.findByRole('button', allFiltersButton);
    // The stale `retired` option is ignored.
    expect(trigger).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', resetButton));

    await waitFor(() =>
      expect(router.state.location.search).not.toHaveProperty(
        'cf.open_to_mentoring',
      ),
    );
    expect(router.state.location.search).not.toHaveProperty('cf.availability');
  });
});
