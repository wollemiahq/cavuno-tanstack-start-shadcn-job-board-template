import type { EmployerPipeline } from '@cavuno/board';

/**
 * Which pipeline stage a card sits in — the copy-free core of the applicant
 * pipeline view-model, kept apart so the talent directory can filter saved
 * people by stage without loading the kanban's copy and formatters.
 */

export interface PipelineStageVM {
  id: string;
  label: string;
  systemStage: string | null;
  /** The API-owned system stage cannot be renamed or removed. */
  isProtected: boolean;
}

/**
 * An applicant belongs to a stage when its `stage` token matches the
 * stage's system meaning (protected stages) or its id (custom stages).
 * The `review` column absorbs the legacy `applied` initial token so old
 * applications still land in the right place — mirrors the hosted board.
 */
function belongsToStage(
  applicantStage: string,
  stage: PipelineStageVM,
): boolean {
  if (stage.systemStage === 'review') {
    return applicantStage === 'applied' || applicantStage === 'review';
  }
  return applicantStage === (stage.systemStage ?? stage.id);
}

export function visibleStages(
  pipeline: Pick<EmployerPipeline, 'stages'>,
): PipelineStageVM[] {
  return pipeline.stages
    .filter((stage) => !stage.hidden)
    .map((stage) => ({
      id: stage.id,
      label: stage.label,
      systemStage: stage.systemStage,
      // The API's flag is the single truth for editability — the pre-kanban
      // UI rendered its edit/delete controls from exactly this field, and a
      // client-side guess (e.g. "every systemStage is protected") wrongly
      // locks stages the board owner may rename (the sandbox's Offer stage).
      isProtected: stage.isProtected,
    }));
}

export /** The visible stage an applicant's card sits in (review absorbs unknowns). */
function columnFor(applicantStage: string, stages: PipelineStageVM[]): string {
  return (
    stages.find((stage) => belongsToStage(applicantStage, stage))?.id ??
    stages.find((stage) => stage.systemStage === 'review')?.id ??
    stages[0]?.id ??
    ''
  );
}

/**
 * Which visible stage each candidate sits in on one job's pipeline, keyed by
 * board-user id — the join a talent list linked to the job filters by.
 */
export function candidatePipelineStages(
  pipeline: Pick<EmployerPipeline, 'stages' | 'applicants'>,
) {
  const stages = visibleStages(pipeline);
  const stageByCandidate = new Map<string, string>();
  for (const applicant of pipeline.applicants) {
    if (!applicant.candidateBoardUserId) continue;
    stageByCandidate.set(
      applicant.candidateBoardUserId,
      columnFor(applicant.stage, stages),
    );
  }
  return { stages, stageByCandidate };
}
