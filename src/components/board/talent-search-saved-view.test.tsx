// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useLocation,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentSearchPage } from './talent-search-page';

import { parseTalentSearch } from '@/lib/talent-search';
import { m } from '@/paraglide/messages';
import type { TalentListRecord } from '@/server/employers';
import type { TalentDirectoryEntry } from '@cavuno/board';

const server = vi.hoisted(() => ({
  getEmployerTalentWorkspace: vi.fn(),
  getPipeline: vi.fn(),
  listSavedPeople: vi.fn(),
  listTalentListMemberships: vi.fn(),
  removeTalentListMember: vi.fn(),
  updateTalentList: vi.fn(),
}));

vi.mock('@/server/employers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/employers')>()),
  ...server,
}));
/** The root-session fields the talent page reads. */
type TestSession = {
  ready: boolean;
  user: { emailVerified: boolean } | null;
  employerCompanies: Array<{
    status: string;
    company: { slug: string };
  }> | null;
};
type SessionRef = { current: TestSession | null };
const session = vi.hoisted((): SessionRef => ({
  current: null,
}));
const employerSession: TestSession = {
  ready: true,
  user: { emailVerified: true },
  employerCompanies: [{ status: 'approved', company: { slug: 'acme' } }],
};
vi.mock('@/components/root-session', () => ({
  useRootSession: () => session.current,
}));

function candidate(id: string, name: string): TalentDirectoryEntry {
  return {
    object: 'talent_directory_entry',
    id,
    handle: id.replace('bu_', ''),
    displayName: name,
    headline: 'Robotics engineer',
    location: 'Berlin',
    avatarUrl: null,
    summary: null,
    bio: null,
    jobSearchStatus: 'open_to_offers',
    skills: [],
    experiences: [],
    education: [],
    customFieldValues: {},
    objectReferences: [],
  };
}

function savedSearch(jobId: string | null): TalentListRecord {
  return {
    id: 'list_berlin',
    object: 'talent_list',
    name: 'Berlin engineers',
    filters: { place: 'berlin' },
    jobId,
    createdBy: 'bu_employer',
    createdAt: 1,
    updatedAt: 1,
    memberCount: 3,
  };
}

function member(entry: TalentDirectoryEntry) {
  return {
    id: `tlm_${entry.id}`,
    object: 'talent_list_member',
    candidate: entry,
    addedAt: 1,
    addedBy: 'bu_employer',
  };
}

const ada = candidate('bu_ada', 'Ada Lovelace');

beforeEach(() => {
  session.current = employerSession;
  // jsdom has no scrolling; a page change scrolls the results to the top.
  Element.prototype.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  server.getPipeline.mockResolvedValue({
    stages: [
      {
        id: 'stage_short',
        label: 'Shortlisted',
        systemStage: 'shortlisted',
        isProtected: true,
        hidden: false,
      },
      {
        id: 'stage_interview',
        label: 'Interview',
        systemStage: null,
        isProtected: false,
        hidden: false,
      },
    ],
    applicants: [],
  });
  server.listSavedPeople.mockResolvedValue({
    data: [member(ada)],
    count: 1,
    total: 3,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderSaved(initial: string, jobId: string | null = null) {
  server.getEmployerTalentWorkspace.mockResolvedValue({
    jobs: {
      data: [{ id: 'job_a', title: 'Robotics lead', status: 'published' }],
    },
    lists: { data: [savedSearch(jobId)] },
  });
  const rootRoute = createRootRoute();
  const talentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/talent/',
    validateSearch: parseTalentSearch,
    component: function Talent() {
      const search = parseTalentSearch(
        useLocation({ select: (location) => location.search }),
      );
      return (
        <TalentSearchPage
          candidates={[]}
          search={search}
          count={0}
          page={search.page ?? 1}
          pageSize={24}
          language="en"
          onPageChange={vi.fn()}
          onSelectedTalentReplace={vi.fn()}
          onSelectedTalentPush={vi.fn()}
          detail={null}
        />
      );
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([talentRoute]),
    history: createMemoryHistory({ initialEntries: [initial] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

function pickOption(name: string) {
  const option = screen.getByRole('option', { name });
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.click(option);
}

describe('TalentSearchPage — Saved view of a saved search', () => {
  it('shows only the saved people the current filters keep', async () => {
    const router = renderSaved(
      '/talent/?list=list_berlin&saved=1&place=berlin&within=25',
    );

    expect(await screen.findByText('Ada Lovelace')).toBeVisible();
    expect(server.listSavedPeople).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'acme',
        listId: 'list_berlin',
        // The search distance goes along, as for `/talent`.
        query: expect.objectContaining({ place: 'berlin', within: 25 }),
        offset: 0,
        limit: 24,
      }),
    });
    expect(
      screen.getByRole('combobox', { name: m.talentSaved_showLabel() }),
    ).toHaveTextContent(
      m.talentSaved_savedOption({ count: 3, countLabel: '3' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: m.talentSaved_showAllAction() }),
    );
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        list: 'list_berlin',
        saved: true,
      }),
    );
  });

  it('switches from everyone the search finds to its saved people', async () => {
    const router = renderSaved('/talent/?list=list_berlin&place=berlin&page=2');

    const view = await screen.findByRole('combobox', {
      name: m.talentSaved_showLabel(),
    });
    expect(view).toHaveTextContent(m.talentSaved_allCandidatesOption());
    fireEvent.click(view);
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual([
      m.talentSaved_allCandidatesOption(),
      m.talentSaved_savedCountOption({ count: 3, countLabel: '3' }),
    ]);
    pickOption(m.talentSaved_savedCountOption({ count: 3, countLabel: '3' }));

    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        list: 'list_berlin',
        place: 'berlin',
        saved: true,
      }),
    );
    expect(
      screen.getByRole('combobox', { name: m.talentSaved_showLabel() }),
    ).toHaveTextContent(
      m.talentSaved_savedOption({ count: 3, countLabel: '3' }),
    );
    expect(server.updateTalentList).not.toHaveBeenCalled();
  });

  it('switches from its saved people back to everyone the search finds', async () => {
    const router = renderSaved(
      '/talent/?list=list_berlin&saved=1&stage=stage_interview',
      'job_a',
    );

    fireEvent.click(
      await screen.findByRole('combobox', { name: m.talentSaved_showLabel() }),
    );
    pickOption(m.talentSaved_allCandidatesOption());

    await waitFor(() =>
      expect(router.state.location.search).not.toHaveProperty('saved'),
    );
    expect(router.state.location.search).toMatchObject({ list: 'list_berlin' });
    expect(router.state.location.search).not.toHaveProperty('stage');
    expect(
      screen.queryByRole('combobox', { name: m.talentSaved_stageLabel() }),
    ).toBeNull();
  });

  it('offers no stage filter on a saved search without a job', async () => {
    renderSaved('/talent/?list=list_berlin&saved=1');

    await screen.findByText('Ada Lovelace');
    expect(
      screen.queryByRole('combobox', { name: m.talentSaved_stageLabel() }),
    ).toBeNull();
    expect(server.getPipeline).not.toHaveBeenCalled();
  });

  it('filters saved people by their stage on the linked job', async () => {
    renderSaved(
      '/talent/?list=list_berlin&saved=1&stage=stage_interview',
      'job_a',
    );

    expect(
      await screen.findByRole('combobox', { name: m.talentSaved_stageLabel() }),
    ).toHaveTextContent('Interview');
    expect(server.listSavedPeople).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stage: 'stage_interview',
        offset: 0,
        limit: 24,
      }),
    });
  });

  it('pages a stage’s saved people on the server', async () => {
    const router = renderSaved(
      '/talent/?list=list_berlin&saved=1&stage=stage_interview',
      'job_a',
    );

    await screen.findByText('Ada Lovelace');
    expect(server.listSavedPeople).toHaveBeenCalledTimes(1);

    router.history.push(
      '/talent/?list=list_berlin&saved=1&stage=stage_interview&page=2',
    );
    await waitFor(() =>
      expect(server.listSavedPeople).toHaveBeenCalledTimes(2),
    );
    expect(server.listSavedPeople).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        stage: 'stage_interview',
        offset: 24,
        limit: 24,
      }),
    });

    // The first column also shows applications stored as applied or review.
    router.history.push('/talent/?list=list_berlin&saved=1&stage=stage_short');
    await waitFor(() =>
      expect(server.listSavedPeople).toHaveBeenCalledTimes(3),
    );
    expect(server.listSavedPeople).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        stage: 'shortlisted,applied,review',
        offset: 0,
      }),
    });
  });

  it('rereads a stage’s saved people after an unsave', async () => {
    server.listTalentListMemberships.mockResolvedValue({
      data: [{ listId: 'list_berlin' }],
    });
    server.removeTalentListMember.mockResolvedValue({ ok: true, data: null });
    renderSaved(
      '/talent/?list=list_berlin&saved=1&stage=stage_interview',
      'job_a',
    );

    await screen.findByText('Ada Lovelace');
    fireEvent.click(
      screen.getByRole('button', { name: m.talentSave_savedLabel() }),
    );
    const item = await screen.findByRole('menuitemcheckbox', {
      name: 'Berlin engineers',
    });
    await waitFor(() => expect(item).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(item);

    await waitFor(() =>
      expect(server.listSavedPeople).toHaveBeenCalledTimes(2),
    );
  });

  it('moves a stage page past the end back to the last page', async () => {
    server.listSavedPeople.mockImplementation(({ data }) =>
      Promise.resolve(
        data.offset === 0
          ? { data: [member(ada)], count: 1, total: 3 }
          : { data: [], count: 1, total: 3 },
      ),
    );
    const router = renderSaved(
      '/talent/?list=list_berlin&saved=1&stage=stage_interview&page=3',
      'job_a',
    );

    expect(await screen.findByText('Ada Lovelace')).toBeVisible();
    expect(router.state.location.search).toEqual({
      list: 'list_berlin',
      saved: true,
      stage: 'stage_interview',
    });
  });

  it('says so when nobody is saved yet', async () => {
    server.listSavedPeople.mockResolvedValue({ data: [], count: 0, total: 0 });
    renderSaved('/talent/?list=list_berlin&saved=1');

    expect(await screen.findByText(m.talentSaved_emptyTitle())).toBeVisible();
    expect(
      screen.queryByRole('button', { name: m.talentSaved_showAllAction() }),
    ).toBeNull();
  });

  it('opens the directory when the saved search is not this viewer’s', async () => {
    const router = renderSaved(
      '/talent/?list=list_gone&saved=1&stage=stage_short',
    );

    await waitFor(() =>
      expect(router.state.location.search).toEqual({ list: 'list_gone' }),
    );
    expect(
      await screen.findByText(m.talentDirectory_emptyText()),
    ).toBeVisible();
    expect(server.listSavedPeople).not.toHaveBeenCalled();
  });

  it('opens the directory for a Saved link when the viewer is no employer', async () => {
    session.current = { ready: true, user: null, employerCompanies: null };
    const router = renderSaved('/talent/?list=list_berlin&saved=1');

    await waitFor(() =>
      expect(router.state.location.search).toEqual({ list: 'list_berlin' }),
    );
    expect(server.getEmployerTalentWorkspace).not.toHaveBeenCalled();
  });

  it('moves a page past the end back to the last page', async () => {
    server.listSavedPeople.mockImplementation(({ data }) =>
      Promise.resolve(
        data.offset === 0
          ? { data: [member(ada)], count: 1, total: 3 }
          : { data: [], count: 1, total: 3 },
      ),
    );
    const router = renderSaved('/talent/?list=list_berlin&saved=1&page=3');

    expect(await screen.findByText('Ada Lovelace')).toBeVisible();
    expect(router.state.location.search).toEqual({
      list: 'list_berlin',
      saved: true,
    });
    expect(screen.queryByText(m.talentSaved_noMatchTitle())).toBeNull();
  });

  it('drops a stage the linked job does not have', async () => {
    const router = renderSaved(
      '/talent/?list=list_berlin&saved=1&stage=stage_deleted',
      'job_a',
    );

    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        list: 'list_berlin',
        saved: true,
      }),
    );
    await screen.findByText('Ada Lovelace');
    for (const [call] of server.listSavedPeople.mock.calls) {
      expect(call.data.stage).toBeUndefined();
    }
  });
});
