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

afterEach(cleanup);

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

    const status = await screen.findByRole('combobox', {
      name: 'Job search status',
    });
    const relocate = screen.getByRole('combobox', {
      name: 'Open to relocate',
    });
    expect(status).toHaveTextContent('Any status');
    expect(relocate).toHaveTextContent('Any relocation');
    const sort = screen.getByRole('combobox', { name: 'Sort' });
    expect(sort).toHaveTextContent('Sort:');
    expect(sort).toHaveTextContent('Best Match');
    expect(
      container.querySelector("[data-slot='talent-filter-bar']"),
    ).not.toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByPlaceholderText('Name or headline')).toBeNull();
    expect(screen.queryByLabelText('Search')).toBeNull();
  });

  it('describes the Filters sheet as candidate filters, not job results', async () => {
    renderFilters();

    fireEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(sheet).toHaveTextContent(
      'Refine candidate results by status and relocation.',
    );
    expect(sheet).not.toHaveTextContent('Skill');
    expect(sheet).not.toHaveTextContent('Languages');
    expect(sheet).not.toHaveTextContent('Seniority');
    expect(sheet).not.toHaveTextContent('Work authorization');
    expect(sheet).not.toHaveTextContent('Interested role');
    expect(sheet).not.toHaveTextContent('Refine job results');
  });

  it('keeps a job-bound interestedRole when status changes', async () => {
    const { router } = renderFilters('?interestedRole=Robotics%20Engineer');

    fireEvent.click(
      await screen.findByRole('combobox', { name: 'Job search status' }),
    );
    const active = screen.getByRole('option', { name: 'Actively looking' });
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

    fireEvent.click(await screen.findByRole('button', { name: 'Reset' }));

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        interestedRole: 'Robotics Engineer',
      }),
    );
    expect(router.state.location.search).not.toHaveProperty('jobSearchStatus');
  });

  it('writes sort to the URL immediately', async () => {
    const { router } = renderFilters();

    fireEvent.click(await screen.findByRole('combobox', { name: 'Sort' }));
    const newest = screen.getByRole('option', { name: 'Newest' });
    fireEvent.pointerDown(newest, { pointerType: 'mouse' });
    fireEvent.click(newest);

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ sort: 'newest' }),
    );
  });

  it('has no All filters button without filterable profile fields', async () => {
    renderFilters();

    await screen.findByRole('combobox', { name: 'Job search status' });
    expect(screen.queryByRole('button', { name: /All filters/ })).toBeNull();
  });

  it('adds candidate profile fields to the sheet and writes cf.* on Apply', async () => {
    const { router } = renderFilters('?jobSearchStatus=actively_looking', [
      mentoring,
      availability,
    ]);

    fireEvent.click(await screen.findByRole('button', { name: /All filters/ }));
    const sheet = screen.getByRole('dialog', { name: 'All filters' });
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
      within(sheet).getByRole('button', { name: 'Apply filters' }),
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

    const trigger = await screen.findByRole('button', { name: /All filters/ });
    // The stale `retired` option is ignored.
    expect(trigger).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() =>
      expect(router.state.location.search).not.toHaveProperty(
        'cf.open_to_mentoring',
      ),
    );
    expect(router.state.location.search).not.toHaveProperty('cf.availability');
  });
});
