// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { useState } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { m } from '../../paraglide/messages';
import {
  TalentSaveToJob,
  type TalentListMembershipChange,
} from './talent-save-to-job';

import { boardErrorMessage } from '@/lib/board-error-message';
import type { TalentListRecord } from '@/server/employers';

const addMember = vi.fn();
const removeMember = vi.fn();
const saveCandidate = vi.fn();

afterEach(() => {
  cleanup();
  addMember.mockReset();
  removeMember.mockReset();
  saveCandidate.mockReset();
});

const jobs = [
  { id: 'job_a', title: 'First role' },
  { id: 'job_b', title: 'Second role' },
];

function list(
  id: string,
  name: string,
  jobId: string | null,
): TalentListRecord {
  return {
    id,
    object: 'talent_list',
    name,
    filters: {},
    jobId,
    createdBy: 'bu_employer',
    createdAt: 1,
    updatedAt: 1,
    memberCount: 0,
  };
}

const lists = [
  list('tl_a', 'Backend engineers', 'job_a'),
  list('tl_b', 'Berlin designers', null),
];

function memberInput(listId: string) {
  return { data: { slug: 'acme', listId, candidateBoardUserId: 'bu_ada' } };
}

function openMenu(state: 'save' | 'saved' = 'save') {
  fireEvent.click(
    screen.getByRole('button', {
      name:
        state === 'saved'
          ? m.talentSave_savedLabel()
          : m.talentSave_saveLabel(),
    }),
  );
}

describe('TalentSaveToJob', () => {
  it('lists every saved search, ticked from the person’s memberships', async () => {
    const onOpen = vi.fn();
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={lists}
        candidateBoardUserId="bu_ada"
        memberListIds={['tl_b']}
        onOpen={onOpen}
        addMember={addMember}
        removeMember={removeMember}
      />,
    );

    openMenu('saved');
    expect(onOpen).toHaveBeenCalled();
    expect(
      await screen.findByRole('menuitemcheckbox', {
        name: 'Backend engineers',
      }),
    ).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Berlin designers' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.queryByRole('menuitemcheckbox', { name: 'First role' }),
    ).toBeNull();
  });

  it('saves on tick and removes on untick, reporting each change', async () => {
    const onMembershipChange = vi.fn();
    addMember.mockResolvedValue({
      ok: true,
      data: { id: 'tlm_1', object: 'talent_list_member', created: true },
    });
    removeMember.mockResolvedValue({ ok: true, data: null });
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={lists}
        candidateBoardUserId="bu_ada"
        memberListIds={['tl_b']}
        onMembershipChange={onMembershipChange}
        addMember={addMember}
        removeMember={removeMember}
        saveCandidate={saveCandidate}
      />,
    );

    openMenu('saved');
    fireEvent.click(
      await screen.findByRole('menuitemcheckbox', {
        name: 'Backend engineers',
      }),
    );
    await waitFor(() =>
      expect(onMembershipChange).toHaveBeenCalledWith({
        listId: 'tl_a',
        saved: true,
        created: true,
      }),
    );
    expect(addMember).toHaveBeenCalledWith(memberInput('tl_a'));
    // A linked list shortlists server-side; the control never does it too.
    expect(saveCandidate).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('menuitemcheckbox', { name: 'Berlin designers' }),
    );
    await waitFor(() =>
      expect(onMembershipChange).toHaveBeenCalledWith({
        listId: 'tl_b',
        saved: false,
        created: undefined,
      }),
    );
    expect(removeMember).toHaveBeenCalledWith(memberInput('tl_b'));
  });

  it('explains a full saved search inline and leaves it unticked', async () => {
    addMember.mockResolvedValue({
      ok: false,
      code: 'talent_list_full',
      message: 'full',
    });
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={lists}
        candidateBoardUserId="bu_ada"
        memberListIds={[]}
        addMember={addMember}
        removeMember={removeMember}
      />,
    );

    openMenu();
    fireEvent.click(
      await screen.findByRole('menuitemcheckbox', {
        name: 'Backend engineers',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      boardErrorMessage({ code: 'talent_list_full' }),
    );
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Backend engineers' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('follows the parent’s memberships once a change is confirmed', async () => {
    addMember.mockResolvedValue({
      ok: true,
      data: { id: 'tlm_1', object: 'talent_list_member', created: true },
    });
    removeMember.mockResolvedValue({ ok: true, data: null });
    // A card and the profile pane: two bookmarks over one parent state.
    function TwoBookmarks() {
      const [memberListIds, setMemberListIds] = useState<readonly string[]>([]);
      const onMembershipChange = (change: TalentListMembershipChange) =>
        setMemberListIds((current) =>
          change.saved
            ? [...current, change.listId]
            : current.filter((id) => id !== change.listId),
        );
      return (
        <>
          {['card', 'pane'].map((slot) => (
            <div key={slot} data-testid={slot}>
              <TalentSaveToJob
                slug="acme"
                jobs={jobs}
                lists={lists}
                candidateBoardUserId="bu_ada"
                memberListIds={memberListIds}
                onMembershipChange={onMembershipChange}
                addMember={addMember}
                removeMember={removeMember}
              />
            </div>
          ))}
        </>
      );
    }
    render(<TwoBookmarks />);
    const bookmark = (slot: string, state: 'save' | 'saved') =>
      within(screen.getByTestId(slot)).getByRole('button', {
        name:
          state === 'saved'
            ? m.talentSave_savedLabel()
            : m.talentSave_saveLabel(),
      });

    fireEvent.click(bookmark('card', 'save'));
    fireEvent.click(
      await screen.findByRole('menuitemcheckbox', {
        name: 'Backend engineers',
      }),
    );
    await waitFor(() => expect(bookmark('pane', 'saved')).toBeVisible());
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });

    fireEvent.click(bookmark('pane', 'saved'));
    fireEvent.click(
      await screen.findByRole('menuitemcheckbox', {
        name: 'Backend engineers',
      }),
    );
    await waitFor(() => expect(bookmark('card', 'save')).toBeVisible());
    expect(removeMember).toHaveBeenCalledTimes(1);
  });

  it('says so when the person’s saved searches could not be read', async () => {
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={lists}
        candidateBoardUserId="bu_ada"
        membershipsFailed
        addMember={addMember}
        removeMember={removeMember}
      />,
    );

    openMenu();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.talentSave_membershipsError(),
    );
  });

  it('waits for memberships before letting a saved search be toggled', async () => {
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={lists}
        candidateBoardUserId="bu_ada"
        addMember={addMember}
        removeMember={removeMember}
      />,
    );

    openMenu();
    const item = await screen.findByRole('menuitemcheckbox', {
      name: 'Backend engineers',
    });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(item);
    expect(addMember).not.toHaveBeenCalled();
  });

  it('shortlists straight onto a job while the company has no saved searches', async () => {
    saveCandidate.mockResolvedValue({
      ok: true,
      data: { id: 'src_1', object: 'sourced_candidate', created: true },
    });
    render(
      <TalentSaveToJob
        slug="acme"
        jobs={jobs}
        lists={[]}
        candidateBoardUserId="bu_ada"
        saveCandidate={saveCandidate}
        addMember={addMember}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: m.talentSave_shortlistLabel() }),
    );
    expect(
      await screen.findByRole('menuitem', { name: m.talentLists_newList() }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('menuitemcheckbox', { name: 'Second role' }),
    );

    await waitFor(() =>
      expect(saveCandidate).toHaveBeenCalledWith({
        data: { slug: 'acme', job: 'job_b', candidateBoardUserId: 'bu_ada' },
      }),
    );
    expect(addMember).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: m.talentSave_shortlistedLabel() }),
      ).toBeInTheDocument(),
    );
  });

  it('renders nothing without saved searches or published jobs', () => {
    const { container } = render(
      <TalentSaveToJob
        slug="acme"
        jobs={[]}
        lists={[]}
        candidateBoardUserId="bu_ada"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
