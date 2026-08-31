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
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TalentListsPicker } from './talent-lists-picker';

import { parseTalentSearch } from '@/lib/talent-search';
import { createTalentList, type TalentListRecord } from '@/server/employers';

vi.mock('@/server/employers', () => ({
  createTalentList: vi.fn(),
}));

afterEach(cleanup);

const berlin: TalentListRecord = {
  id: 'list_berlin',
  object: 'talent_list',
  name: 'Berlin engineers',
  filters: { skill: 'go', interestedRole: 'Engineer' },
  jobId: null,
  createdBy: 'bu_employer',
  createdAt: 1,
  updatedAt: 1,
};

const bound: TalentListRecord = {
  id: 'list_smoke',
  object: 'talent_list',
  name: 'Smoke Robotics',
  filters: { interestedRole: 'Smoke Robotics Engineer' },
  jobId: 'job_smoke',
  createdBy: 'bu_employer',
  createdAt: 1,
  updatedAt: 1,
};

function renderPicker(
  lists: TalentListRecord[] = [berlin, bound],
  selectedListId?: string,
) {
  const onListsChange = vi.fn();
  const rootRoute = createRootRoute();
  const talentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/talent/',
    validateSearch: parseTalentSearch,
    component: () => (
      <TalentListsPicker
        slug="tls-smoke-labs"
        lists={lists}
        jobs={[{ id: 'job_smoke', title: 'Smoke Robotics Engineer' }]}
        selectedListId={selectedListId}
        currentFilters={{ skill: 'go' }}
        onListsChange={onListsChange}
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([talentRoute]),
    history: createMemoryHistory({
      initialEntries: [
        selectedListId ? `/talent/?list=${selectedListId}` : '/talent/',
      ],
    }),
  });

  return {
    ...render(<RouterProvider router={router} />),
    router,
    onListsChange,
  };
}

describe('TalentListsPicker', () => {
  it('groups saved lists and sourced jobs in one menu', async () => {
    renderPicker();

    fireEvent.click(await screen.findByRole('button', { name: 'Lists' }));
    expect(
      screen.getByRole('menuitemradio', { name: 'All candidates' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('menuitemradio', { name: 'Berlin engineers' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('menuitemradio', { name: 'Smoke Robotics' }),
    ).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'New list…' })).toBeTruthy();
    expect(
      screen.getByRole('menuitemradio', { name: 'Smoke Robotics Engineer' }),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: /pipeline/i })).toBeNull();
  });

  it('keeps a sourced job on /talent instead of opening the pipeline', async () => {
    const { router } = renderPicker();

    fireEvent.click(await screen.findByRole('button', { name: 'Lists' }));
    fireEvent.click(
      screen.getByRole('menuitemradio', { name: 'Smoke Robotics Engineer' }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        sourced: 'job_smoke',
      }),
    );
    expect(router.state.location.pathname).toBe('/talent');
  });

  it('writes a list predicate into the talent URL', async () => {
    const { router } = renderPicker();

    fireEvent.click(await screen.findByRole('button', { name: 'Lists' }));
    fireEvent.click(
      screen.getByRole('menuitemradio', { name: 'Berlin engineers' }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        list: 'list_berlin',
        skill: 'go',
        interestedRole: 'Engineer',
      }),
    );
  });

  it('creates a blank list from the current filters', async () => {
    vi.mocked(createTalentList).mockResolvedValueOnce({
      ok: true,
      data: {
        ...berlin,
        id: 'list_new',
        name: 'Platform search',
        filters: { skill: 'go' },
      },
    });
    const { onListsChange } = renderPicker();

    fireEvent.click(await screen.findByRole('button', { name: 'Lists' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'New list…' }));
    expect(screen.getByRole('radio', { name: 'Current filters' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'A job' })).toBeTruthy();
    fireEvent.change(await screen.findByLabelText('Name'), {
      target: { value: 'Platform search' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create list' }));

    await waitFor(() =>
      expect(createTalentList).toHaveBeenCalledWith({
        data: {
          slug: 'tls-smoke-labs',
          name: 'Platform search',
          filters: { skill: 'go' },
        },
      }),
    );
    expect(onListsChange).toHaveBeenCalled();
  });
});
