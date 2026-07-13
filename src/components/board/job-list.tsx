import { SearchLg } from "@untitledui/icons";

import { boardCopy } from "#/copy";

import { toJobCardVM } from "@/board/job-view-model";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { JobCard } from "@/components/board/job-card";
/**
 * The job list (CAV-485, rows CAV-497) — a responsive two-column grid of
 * Untitled UI tiles, or single-column Lumen-style listing rows, with the
 * collection's `EmptyState` when nothing matches.
 *
 * Thin binding layer: takes the loader's `PublicJobCard[]` and maps each
 * to a `JobCardVM` for the pure-markup `JobCard`. Consumers keep passing
 * wire cards; the view-model boundary lives here so every list surface
 * shares it (ADR-0070).
 */
import type { PublicJobCard } from "@cavuno/board";
import type { BoardLabelOverrides } from "@cavuno/board/format";

export function JobList({
    jobs,
    language,
    labels,
    variant = "grid",
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
    variant?: "grid" | "rows" | "compact";
}) {
    const copy = boardCopy(language, labels);

    if (jobs.length === 0) {
        return (
            <EmptyState size="sm" className="py-12">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>{copy.jobSearch.headingJobs}</EmptyState.Title>
                    <EmptyState.Description>{copy.jobSearch.noJobsMatchText}</EmptyState.Description>
                </EmptyState.Content>
            </EmptyState>
        );
    }

    if (variant === "rows") {
        return (
            <div className="flex flex-col gap-4">
                {jobs.map((job) => (
                    <JobCard key={job.id} vm={toJobCardVM(job, language, labels)} layout="row" />
                ))}
            </div>
        );
    }

    if (variant === "compact") {
        return (
            <div className="flex flex-col gap-4">
                {jobs.map((job) => (
                    <JobCard key={job.id} vm={toJobCardVM(job, language, labels)} compact />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {jobs.map((job) => (
                <JobCard key={job.id} vm={toJobCardVM(job, language, labels)} />
            ))}
        </div>
    );
}
