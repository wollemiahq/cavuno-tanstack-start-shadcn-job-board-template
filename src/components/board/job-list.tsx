import { boardCopy } from '#/copy';

import { Search } from 'lucide-react';

import { toJobCardVM } from '@/board/job-view-model';
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
 * Thin binding layer: takes the loader's `PublicJobCard[]` and maps each
 * to a `JobCardVM` for the pure-markup `JobCard`. Consumers keep passing
 * wire cards; the view-model boundary lives here so every list surface
 * shares it (ADR-0070).
 */
import type { PublicJobCard } from '@cavuno/board';
import type { BoardLabelOverrides } from '@cavuno/board/format';

export function JobList({
  jobs,
  language,
  labels,
  variant = 'grid',
  compact = false,
}: {
  jobs: PublicJobCard[];
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
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            vm={toJobCardVM(job, language, labels)}
            layout="row"
          />
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            vm={toJobCardVM(job, language, labels)}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          vm={toJobCardVM(job, language, labels)}
          compact={compact}
        />
      ))}
    </div>
  );
}
