import {
  paginate,
  type EmployerPipeline,
  type EmployerPipelineQuery,
  type TalentListMember,
  type TalentListMembersListEnvelope,
  type TalentListMembersQuery,
} from '@cavuno/board';

import { stageFilterTokens } from '@/board/pipeline-stages';
import type { SavedPeopleFilters } from '@/lib/talent-search';

/** A list holds at most 500 people; the API pages them 50 at a time. */
const SAVED_PEOPLE_CAP = 500;
const SAVED_PEOPLE_SCAN_PAGE = 50;
/** Applicants per pipeline read while collecting one stage's people (the
 *  API's maximum page). */
const PIPELINE_SCAN_PAGE = 2000;

export type SavedPeoplePage = {
  data: TalentListMember[];
  /** Saved people the filters (and stage) keep. */
  count: number;
  /** Every visible saved person, before filters. */
  total: number;
};

type ReadPipeline = (
  query: Omit<EmployerPipelineQuery, 'job'>,
) => Promise<
  Pick<EmployerPipeline, 'stages' | 'applicants' | 'hasMore' | 'nextCursor'>
>;

type ReadMembers = (
  query?: TalentListMembersQuery,
) => Promise<TalentListMembersListEnvelope>;

/** Board-user ids of everyone sitting in one visible stage of a pipeline. */
async function candidatesInStage(
  readPipeline: ReadPipeline,
  stageId: string,
): Promise<Set<string>> {
  const tokens = stageFilterTokens(await readPipeline({ limit: 1 }), stageId);
  const ids = new Set<string>();
  await Promise.all(
    (tokens ?? []).map(async (stage) => {
      let cursor: string | undefined;
      do {
        const page = await readPipeline({
          stage,
          limit: PIPELINE_SCAN_PAGE,
          cursor,
        });
        for (const applicant of page.applicants) {
          if (applicant.candidateBoardUserId) {
            ids.add(applicant.candidateBoardUserId);
          }
        }
        cursor = page.hasMore ? (page.nextCursor ?? undefined) : undefined;
      } while (cursor);
    }),
  );
  return ids;
}

/**
 * One page of a list's saved people that sit in one stage of the linked
 * job's pipeline. The members API cannot filter by stage, so every matching
 * saved person (at most 500) is read and joined to that stage's applicants,
 * read with the API's stage filter, then paged.
 */
export async function readSavedPeopleInStage({
  readPipeline,
  readMembers,
  query,
  stageId,
  offset,
  limit,
}: {
  readPipeline: ReadPipeline;
  readMembers: ReadMembers;
  query: SavedPeopleFilters;
  stageId: string;
  offset: number;
  limit: number;
}): Promise<SavedPeoplePage> {
  let total = 0;
  const [inStageIds, matches] = await Promise.all([
    candidatesInStage(readPipeline, stageId),
    paginate(
      async (page?: TalentListMembersQuery) => {
        const result = await readMembers(page);
        total = result.total;
        return result;
      },
      { ...query, limit: SAVED_PEOPLE_SCAN_PAGE },
    ).toArray({ limit: SAVED_PEOPLE_CAP }),
  ]);
  const inStage = matches.filter((member) =>
    inStageIds.has(member.candidate.id),
  );
  return {
    data: inStage.slice(offset, offset + limit),
    count: inStage.length,
    total,
  };
}
