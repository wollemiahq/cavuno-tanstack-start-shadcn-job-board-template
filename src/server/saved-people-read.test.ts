import { describe, expect, it, vi } from 'vitest';

import { readSavedPeopleInStage } from './saved-people-read';

import type { EmployerPipelineStage } from '@cavuno/board';

type Stage = Pick<EmployerPipelineStage, 'id' | 'systemStage'> & {
  hidden?: boolean;
};

const stages: Stage[] = [
  { id: 'stage_review', systemStage: 'review' },
  { id: 'stage_short', systemStage: 'shortlisted' },
  { id: 'stage_interview', systemStage: null },
  { id: 'stage_archive', systemStage: null, hidden: true },
];

/** Applicants by their wire `stage` token; each token pages 2 at a time. */
const applicantsByStage = new Map([
  ['review', ['bu_r1']],
  ['applied', ['bu_a1']],
  ['shortlisted', ['bu_s1', 'bu_s2', 'bu_s3']],
  ['stage_interview', ['bu_i1']],
  ['stage_archive', ['bu_h1']],
]);

function readPipeline() {
  return vi.fn(
    async (query: { stage?: string; limit?: number; cursor?: string }) => {
      const all = query.stage ? (applicantsByStage.get(query.stage) ?? []) : [];
      const start = Number(query.cursor ?? 0);
      const end = start + 2;
      return {
        stages: stages.map((stage, position) => ({
          object: 'employer_pipeline_stage' as const,
          jobId: 'job_a',
          label: stage.id,
          isProtected: stage.systemStage !== null,
          position,
          ...stage,
          hidden: stage.hidden ?? false,
        })),
        applicants: all.slice(start, end).map((candidateBoardUserId) => ({
          candidateBoardUserId,
        })),
        hasMore: end < all.length,
        nextCursor: end < all.length ? String(end) : null,
      };
    },
  );
}

/** The list's saved people, served 50 a page like the members API. */
function readMembers(ids: string[]) {
  return vi.fn(async (query?: { cursor?: string; limit?: number }) => {
    const start = Number(query?.cursor ?? 0);
    const end = start + (query?.limit ?? 20);
    return {
      object: 'list' as const,
      data: ids.slice(start, end).map((id) => ({
        id: `tlm_${id}`,
        object: 'talent_list_member' as const,
        candidate: { id },
        addedAt: 1,
        addedBy: 'bu_employer',
      })),
      hasMore: end < ids.length,
      nextCursor: end < ids.length ? String(end) : null,
      total: ids.length,
    };
  });
}

async function inStage(stageId: string, saved: string[]) {
  // SAFETY: the fakes return only the fields the join reads.
  const result = await readSavedPeopleInStage({
    readPipeline: readPipeline() as never,
    readMembers: readMembers(saved) as never,
    query: {},
    stageId,
  });
  return {
    ids: result.data.map((member) => member.candidate.id),
    count: result.count,
    total: result.total,
  };
}

const padding = Array.from({ length: 60 }, (_, index) => `bu_other${index}`);

describe('readSavedPeopleInStage', () => {
  it('joins saved people across member and pipeline pages', async () => {
    // bu_s3 is on the second pipeline page and past the first member page.
    const saved = ['bu_s1', ...padding, 'bu_s3', 'bu_i1'];

    await expect(inStage('stage_short', saved)).resolves.toEqual({
      ids: ['bu_s1', 'bu_s3'],
      count: 2,
      total: saved.length,
    });
  });

  it('puts applied and hidden-stage applicants in the review stage', async () => {
    const saved = ['bu_r1', 'bu_a1', 'bu_h1', 'bu_s1'];

    await expect(inStage('stage_review', saved)).resolves.toMatchObject({
      ids: ['bu_r1', 'bu_a1', 'bu_h1'],
      count: 3,
    });
    await expect(inStage('stage_interview', saved)).resolves.toMatchObject({
      ids: [],
      count: 0,
    });
  });

  it('keeps no one for a hidden or unknown stage', async () => {
    const saved = ['bu_r1', 'bu_h1'];

    await expect(inStage('stage_archive', saved)).resolves.toMatchObject({
      ids: [],
      count: 0,
      total: 2,
    });
    await expect(inStage('stage_gone', saved)).resolves.toMatchObject({
      ids: [],
      count: 0,
    });
  });
});
