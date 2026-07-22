import { boardCopy } from '#/copy';

import { Search } from 'lucide-react';

import { JobCard } from '@/components/board/job-card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
/**
 * The job list (CAV-485, rows CAV-497) — a responsive two-column grid of
 * Card tiles, or single-column Lumen-style listing rows, with the
 * collection's `Empty` when nothing matches.
 *
 * Pure MARKUP over `JobCardVM[]` (ADR-0070 Layer 2): the loader/pane maps
 * `PublicJobCard[]` through `toJobCardVM` before handing this list the
 * resolved cards, so the view-model seam lives outside the presentation
 * layer and this file imports no `@cavuno/board` wire types or mappers.
 */
import type { JobCardVM } from '@/board/job-view-model';
import type { BoardLabelOverrides } from '@cavuno/board/format';

export function JobList({
  jobs,
  language,
  labels,
  variant = 'grid',
  compact = false,
}: {
  jobs: JobCardVM[];
  language: string;
  /** Operator label overrides (`board.context().labels`), ADR-0059. */
  labels?: BoardLabelOverrides;
  /**
   * `grid` — two-column tiles; `rows` — the Lumen-style single-column
   * listing rows (CAV-497); `compact` — a single-column stack of lean
   * cards (no summary/tags) for the similar-jobs right rail (CAV-500).
   */
  variant?: 'grid' | 'rows' | 'compact';
  /**
   * Lean the `grid` tiles the same way the `compact` variant leans its rail
   * cards — no summary, no tag pills. Density is orthogonal to layout, so a
   * grid can be lean without collapsing to the rail's single column.
   */
  compact?: boolean;
}) {
  const copy = boardCopy(language, labels);

  if (jobs.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            <h2>{copy.jobSearch.headingJobs}</h2>
          </EmptyTitle>
          <EmptyDescription>{copy.jobSearch.noJobsMatchText}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (variant === 'rows') {
    return (
      <div className="flex flex-col gap-4">
        {jobs.map((vm) => (
          <JobCard key={vm.id} vm={vm} layout="row" />
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-4">
        {jobs.map((vm) => (
          <JobCard key={vm.id} vm={vm} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {jobs.map((vm) => (
        <JobCard key={vm.id} vm={vm} compact={compact} />
      ))}
    </div>
  );
}
