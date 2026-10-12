'use client';

import { useState } from 'react';

import { Bookmark, LoaderCircle } from 'lucide-react';

import { m } from '../../paraglide/messages';

import {
  CreateTalentListDialog,
  type CreateTalentListFn,
} from '@/components/board/talent-lists-picker';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastActionError } from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';
import {
  talentListDisplayName,
  type TalentListFilters,
} from '@/lib/talent-search';
import { cn } from '@/lib/utils';
import {
  addTalentListMember,
  createTalentList,
  removeTalentListMember,
  saveSourcedCandidate,
  type ActionResult,
  type TalentListRecord,
} from '@/server/employers';

type MemberInput = {
  data: { slug: string; listId: string; candidateBoardUserId: string };
};

export type AddTalentListMemberFn = (
  input: MemberInput,
) => Promise<ActionResult<{ created: boolean }>>;

export type RemoveTalentListMemberFn = (
  input: MemberInput,
) => Promise<ActionResult<null>>;

export type SaveSourcedCandidateFn = (input: {
  data: { slug: string; job: string; candidateBoardUserId: string };
}) => Promise<ActionResult<{ id: string }>>;

/** A confirmed change to which lists one person is saved to. */
export type TalentListMembershipChange = {
  listId: string;
  saved: boolean;
  /** `false` when the person was already on the list (an idempotent add). */
  created?: boolean;
};

type Outcome =
  | { ok: true; created?: boolean }
  | { ok: false; code?: string; message?: string };

const FULL_LIST_CODE = 'talent_list_full';

/**
 * The bookmark on a talent card and in the profile pane. With saved searches
 * it ticks every list the person is saved to; ticking saves them (and, for a
 * list linked to a job, the API also shortlists them there), unticking
 * removes them from the list only. A company with no saved searches yet can
 * still shortlist straight onto a published job, or start a saved search
 * from here.
 */
export function TalentSaveToJob({
  slug,
  jobs,
  lists,
  candidateBoardUserId,
  memberListIds,
  savedHint = false,
  membershipsFailed = false,
  currentFilters = {},
  presentation = 'default',
  onOpen,
  onMembershipChange,
  onListCreated,
  addMember = addTalentListMember,
  removeMember = removeTalentListMember,
  saveCandidate = saveSourcedCandidate,
  createList = createTalentList,
}: {
  slug: string;
  /** Published jobs — shortlist destinations while there are no lists. */
  jobs: Array<{ id: string; title: string }>;
  lists: TalentListRecord[];
  candidateBoardUserId: string;
  /** Lists the person is saved to; `undefined` until loaded. */
  memberListIds?: readonly string[];
  /** Fill the bookmark before memberships load (e.g. in a Saved view). */
  savedHint?: boolean;
  /** Reading the person's memberships failed; reopening retries. */
  membershipsFailed?: boolean;
  /** Filters a saved search started from here keeps. */
  currentFilters?: TalentListFilters;
  presentation?: 'default' | 'icon';
  /** The menu opened — load memberships if they are not known yet. */
  onOpen?: () => void;
  onMembershipChange?: (change: TalentListMembershipChange) => void;
  onListCreated?: (list: TalentListRecord) => void;
  addMember?: AddTalentListMemberFn;
  removeMember?: RemoveTalentListMemberFn;
  saveCandidate?: SaveSourcedCandidateFn;
  createList?: CreateTalentListFn;
}) {
  /**
   * Optimistic ticks, by list id, until the server answers; then the
   * parent's `memberListIds` is the only truth.
   */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [shortlistedJobIds, setShortlistedJobIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const iconOnly = presentation === 'icon';
  const hasLists = lists.length > 0;

  if (!hasLists && jobs.length === 0) return null;

  const savedTo = new Set(memberListIds ?? []);
  for (const [listId, saved] of Object.entries(overrides)) {
    if (saved) savedTo.add(listId);
    else savedTo.delete(listId);
  }
  const pending = pendingIds.length > 0;
  const filled = hasLists
    ? savedTo.size > 0 || (memberListIds === undefined && savedHint)
    : shortlistedJobIds.length > 0;

  function track(
    id: string,
    request: Promise<Outcome>,
    onOk: (o: Outcome) => void,
    onFail: () => void,
  ) {
    setError(null);
    setPendingIds((current) => [...current, id]);
    void request
      .catch((): Outcome => ({ ok: false }))
      .then((outcome) => {
        if (outcome.ok) {
          onOk(outcome);
          return;
        }
        onFail();
        if (outcome.code === FULL_LIST_CODE) {
          setError(boardErrorMessage({ code: outcome.code }));
          return;
        }
        void toastActionError(outcome.message);
      })
      .finally(() =>
        setPendingIds((current) => current.filter((row) => row !== id)),
      );
  }

  function clearOverride(listId: string) {
    setOverrides((current) => {
      const next = { ...current };
      delete next[listId];
      return next;
    });
  }

  function toggleList(listId: string, saved: boolean) {
    if (pendingIds.includes(listId)) return;
    setOverrides((current) => ({ ...current, [listId]: saved }));
    const input = { data: { slug, listId, candidateBoardUserId } };
    const request: Promise<Outcome> = saved
      ? addMember(input).then((result) =>
          result.ok ? { ok: true, created: result.data.created } : result,
        )
      : removeMember(input).then((result) =>
          result.ok ? { ok: true } : result,
        );
    track(
      listId,
      request,
      (outcome) => {
        onMembershipChange?.({
          listId,
          saved,
          created: outcome.ok ? outcome.created : undefined,
        });
        clearOverride(listId);
      },
      () => clearOverride(listId),
    );
  }

  function shortlist(job: string) {
    if (pendingIds.includes(job) || shortlistedJobIds.includes(job)) return;
    track(
      job,
      saveCandidate({ data: { slug, job, candidateBoardUserId } }).then(
        (result) => (result.ok ? { ok: true } : result),
      ),
      () => setShortlistedJobIds((current) => [...current, job]),
      () => undefined,
    );
  }

  const label = hasLists
    ? filled
      ? m.talentSave_savedLabel()
      : m.talentSave_saveLabel()
    : filled
      ? m.talentSave_shortlistedLabel()
      : m.talentSave_shortlistLabel();
  const Icon = pending ? LoaderCircle : Bookmark;
  const notice =
    error ??
    (hasLists && memberListIds === undefined && membershipsFailed
      ? m.talentSave_membershipsError()
      : null);

  return (
    <div
      className="relative z-10"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) return;
          setError(null);
          onOpen?.();
        }}
      >
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant={iconOnly ? 'ghost' : 'outline'}
              size={iconOnly ? 'icon' : 'default'}
              aria-label={label}
              className={cn(pending && 'cursor-wait')}
            />
          }
        >
          <Icon
            aria-hidden="true"
            className={cn(pending && 'animate-spin', filled && 'fill-current')}
          />
          {iconOnly ? null : label}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-max max-w-[min(24rem,var(--available-width))] min-w-56"
        >
          {hasLists ? (
            <DropdownMenuGroup>
              <DropdownMenuLabel>{m.talentSave_listsLabel()}</DropdownMenuLabel>
              {lists.map((list) => (
                <DropdownMenuCheckboxItem
                  key={list.id}
                  checked={savedTo.has(list.id)}
                  disabled={
                    memberListIds === undefined || pendingIds.includes(list.id)
                  }
                  onCheckedChange={(checked) => toggleList(list.id, checked)}
                >
                  <span className="min-w-0 truncate">
                    {talentListDisplayName(list.name)}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          ) : (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>{m.talentSave_jobLabel()}</DropdownMenuLabel>
                {jobs.map((job) => (
                  <DropdownMenuCheckboxItem
                    key={job.id}
                    checked={shortlistedJobIds.includes(job.id)}
                    disabled={pendingIds.includes(job.id)}
                    onCheckedChange={(checked) => {
                      if (checked) shortlist(job.id);
                    }}
                  >
                    <span className="min-w-0 truncate">{job.title}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                {m.talentLists_newList()}
              </DropdownMenuItem>
            </>
          )}
          {notice ? (
            <p
              role="alert"
              className="text-destructive max-w-64 px-2 py-1.5 text-xs"
            >
              {notice}
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateTalentListDialog
        slug={slug}
        jobs={jobs}
        currentFilters={currentFilters}
        open={createOpen}
        onOpenChange={setCreateOpen}
        createList={createList}
        onCreated={(list) => {
          onListCreated?.(list);
          toggleList(list.id, true);
        }}
      />
    </div>
  );
}
