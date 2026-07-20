import { formatDate } from '@cavuno/board/format';

import { m } from '@/paraglide/messages';
import type { EmployerApplicant, EmployerPipeline } from '@cavuno/board';

/**
 * Applicant-pipeline VIEW-MODEL — the Layer-1b seam for the employer
 * kanban board. `toPipelineBoardVM` is the ONLY place the ATS wire types
 * (`EmployerPipeline`, its stages + applicants), the SDK date formatter,
 * and the timeline/copy resolution touch the board. It maps the raw
 * pipeline to plain, fully-resolved columns and cards.
 *
 * The presentational board (`ApplicantPipelineBoard`) renders from this
 * VM alone — restructuring the kanban is pure markup over a stable
 * contract, and the correctness rules (which column a card belongs to,
 * how a timeline line reads, which stages an employer may edit) stay here.
 */

/** System stages whose meaning fixes their position and blocks deletion. */
const PROTECTED_HINT = new Set(['review', 'offer', 'hired', 'rejected']);

export interface PipelineStageVM {
  id: string;
  label: string;
  systemStage: string | null;
  /** The API-owned system stage cannot be renamed or removed. */
  isProtected: boolean;
}

export interface PipelineTimelineEntryVM {
  id: string;
  text: string;
}

export interface PipelineCardVM {
  id: string;
  /** Display name, always non-empty (falls back to email, then a label). */
  name: string;
  email: string | null;
  headline: string | null;
  /** 1–2 letter avatar fallback derived from the name/email. */
  initials: string;
  /** "Applied {date}" line, or `null` when the date can't be formatted. */
  appliedLabel: string | null;
  coverNote: string | null;
  resumeUrl: string | null;
  resumeFilename: string | null;
  /** The id of the VISIBLE stage the card currently sits in. */
  columnStageId: string;
  timeline: PipelineTimelineEntryVM[];
}

export interface PipelineBoardVM {
  /** Visible stages, in pipeline order — the kanban columns. */
  stages: PipelineStageVM[];
  cards: PipelineCardVM[];
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

function stageLabelForToken(
  token: string | null,
  stages: readonly { id: string; label: string; systemStage: string | null }[],
): string {
  if (!token) return '—';
  const match = stages.find(
    (stage) => stage.id === token || stage.systemStage === token,
  );
  if (match) return match.label;
  if (token === 'applied') {
    return (
      stages.find((stage) => stage.systemStage === 'review')?.label ?? token
    );
  }
  return token;
}

function initialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '');
  const initials = parts.join('');
  return initials || name.slice(0, 2).toUpperCase() || '—';
}

function toTimelineEntry(
  entry: EmployerApplicant['timeline'][number],
  allStages: readonly {
    id: string;
    label: string;
    systemStage: string | null;
  }[],
): PipelineTimelineEntryVM {
  const base =
    entry.type === 'note_created' && entry.noteBody
      ? m.employerApplicants_timelineNote({ note: entry.noteBody })
      : entry.type === 'stage_changed'
        ? m.employerApplicants_timelineMoved({
            from: stageLabelForToken(entry.fromStage, allStages),
            to: stageLabelForToken(entry.toStage, allStages),
          })
        : entry.type === 'application_created'
          ? m.employerApplicants_timelineApplied()
          : entry.type;
  return {
    id: entry.id,
    text: entry.actorName ? `${base} · ${entry.actorName}` : base,
  };
}

export function toPipelineBoardVM(
  pipeline: EmployerPipeline,
  language: string,
): PipelineBoardVM {
  const allStages = pipeline.stages;
  const stages: PipelineStageVM[] = allStages
    .filter((stage) => !stage.hidden)
    .map((stage) => ({
      id: stage.id,
      label: stage.label,
      systemStage: stage.systemStage,
      isProtected:
        stage.isProtected ||
        (stage.systemStage !== null && PROTECTED_HINT.has(stage.systemStage)),
    }));

  const fallbackStageId =
    stages.find((stage) => stage.systemStage === 'review')?.id ??
    stages[0]?.id ??
    '';

  const cards: PipelineCardVM[] = pipeline.applicants.map((applicant) => {
    const name =
      applicant.candidateName ??
      applicant.candidateEmail ??
      m.employerApplicants_applicantFallbackName();
    const column =
      stages.find((stage) => belongsToStage(applicant.stage, stage))?.id ??
      fallbackStageId;
    const applied = formatDate(language, applicant.appliedAt);
    return {
      id: applicant.id,
      name,
      email: applicant.candidateEmail,
      headline: applicant.candidateHeadline,
      initials: initialsFor(name),
      appliedLabel: applied
        ? m.employerApplicants_appliedLabel({ date: applied })
        : null,
      coverNote: applicant.coverNote,
      resumeUrl: applicant.resumeUrl,
      resumeFilename: applicant.resumeFilename,
      columnStageId: column,
      timeline: applicant.timeline
        .slice(0, 8)
        .map((entry) => toTimelineEntry(entry, allStages)),
    };
  });

  return { stages, cards };
}
