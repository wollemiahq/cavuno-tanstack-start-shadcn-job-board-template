import { describe, expect, it } from 'vitest';

import { stageFilterTokens } from './pipeline-stages';

import type { EmployerPipelineStage } from '@cavuno/board';

function stage(
  id: string,
  systemStage: EmployerPipelineStage['systemStage'],
  hidden = false,
): EmployerPipelineStage {
  return {
    object: 'employer_pipeline_stage',
    id,
    jobId: 'job_a',
    label: id,
    systemStage,
    isProtected: systemStage !== null,
    position: 0,
    hidden,
  };
}

const pipeline = {
  stages: [
    stage('stage_review', 'review'),
    stage('stage_short', 'shortlisted'),
    stage('stage_interview', null),
    stage('stage_archive', null, true),
  ],
};

describe('stageFilterTokens', () => {
  it('reads a stage by its system meaning or, for a custom stage, its id', () => {
    expect(stageFilterTokens(pipeline, 'stage_short')).toEqual(['shortlisted']);
    expect(stageFilterTokens(pipeline, 'stage_interview')).toEqual([
      'stage_interview',
    ]);
  });

  it('puts applied and hidden-stage applications in the review column', () => {
    expect(stageFilterTokens(pipeline, 'stage_review')).toEqual([
      'review',
      'applied',
      'stage_archive',
    ]);
  });

  it('has no tokens for a hidden or unknown stage', () => {
    expect(stageFilterTokens(pipeline, 'stage_archive')).toBeNull();
    expect(stageFilterTokens(pipeline, 'stage_gone')).toBeNull();
  });
});
