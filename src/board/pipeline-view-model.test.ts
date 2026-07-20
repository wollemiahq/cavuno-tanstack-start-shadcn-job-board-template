import { describe, expect, it } from 'vitest';

import { toPipelineBoardVM } from './pipeline-view-model';

import type { EmployerApplicant, EmployerPipeline } from '@cavuno/board';

function stage(
  overrides: Partial<EmployerPipeline['stages'][number]> & {
    id: string;
    label: string;
  },
): EmployerPipeline['stages'][number] {
  return {
    object: 'employer_pipeline_stage',
    jobId: 'job-1',
    systemStage: null,
    isProtected: false,
    hidden: false,
    position: 0,
    ...overrides,
  };
}

function applicant(
  overrides: Partial<EmployerApplicant> & { id: string },
): EmployerApplicant {
  return {
    object: 'employer_applicant',
    jobId: 'job-1',
    candidateBoardUserId: null,
    candidateProfileId: null,
    candidateProfileHandle: null,
    candidateName: null,
    candidateEmail: null,
    candidateHeadline: null,
    candidateLocation: null,
    coverNote: null,
    resumeFilename: null,
    resumeUrl: null,
    stage: 'review',
    source: 'native_apply',
    appliedAt: '2026-07-13T00:00:00.000Z',
    timeline: [],
    ...overrides,
  };
}

const pipeline = (
  stages: EmployerPipeline['stages'],
  applicants: EmployerApplicant[],
): EmployerPipeline => ({
  object: 'employer_pipeline',
  job: { id: 'job-1', title: 'Role', status: 'published', expiresAt: null },
  stages,
  applicants,
});

describe('toPipelineBoardVM', () => {
  it('exposes only visible stages, in order, marking system stages protected', () => {
    const vm = toPipelineBoardVM(
      pipeline(
        [
          stage({
            id: 's-review',
            label: 'Review',
            systemStage: 'review',
            isProtected: true,
            position: 0,
          }),
          stage({
            id: 's-hidden',
            label: 'Archived',
            hidden: true,
            position: 1,
          }),
          stage({ id: 's-interview', label: 'Interview', position: 2 }),
        ],
        [],
      ),
      'en',
    );

    expect(vm.stages.map((s) => s.id)).toEqual(['s-review', 's-interview']);
    expect(vm.stages[0]?.isProtected).toBe(true);
    expect(vm.stages[1]?.isProtected).toBe(false);
  });

  it('places a card in the stage its token resolves to, mapping legacy "applied" to review', () => {
    const vm = toPipelineBoardVM(
      pipeline(
        [
          stage({
            id: 's-review',
            label: 'Review',
            systemStage: 'review',
            position: 0,
          }),
          stage({ id: 's-interview', label: 'Interview', position: 1 }),
        ],
        [
          applicant({ id: 'a-legacy', stage: 'applied' }),
          applicant({ id: 'a-custom', stage: 's-interview' }),
        ],
      ),
      'en',
    );

    const byId = Object.fromEntries(
      vm.cards.map((c) => [c.id, c.columnStageId]),
    );
    expect(byId['a-legacy']).toBe('s-review');
    expect(byId['a-custom']).toBe('s-interview');
  });

  it('resolves the applied label, initials, and timeline copy for a card', () => {
    const vm = toPipelineBoardVM(
      pipeline(
        [
          stage({
            id: 's-review',
            label: 'Review',
            systemStage: 'review',
            position: 0,
          }),
        ],
        [
          applicant({
            id: 'a-1',
            candidateName: 'Ada Lovelace',
            candidateEmail: 'ada@example.com',
            stage: 'review',
            timeline: [
              {
                id: 't-1',
                type: 'note_created',
                actorBoardUserId: 'e-1',
                actorName: 'Grace Hopper',
                noteId: 'n-1',
                noteBody: 'Strong portfolio',
                fromStage: null,
                toStage: null,
                createdAt: '2026-07-14T00:00:00.000Z',
              },
            ],
          }),
        ],
      ),
      'en',
    );

    const card = vm.cards[0]!;
    expect(card.name).toBe('Ada Lovelace');
    expect(card.initials).toBe('AL');
    expect(card.appliedLabel).toMatch(/Applied/);
    expect(card.timeline[0]?.text).toBe(
      'Note: Strong portfolio · Grace Hopper',
    );
  });
});
