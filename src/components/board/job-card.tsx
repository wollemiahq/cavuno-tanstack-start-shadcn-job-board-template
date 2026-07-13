import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/base/avatar/avatar";

import { Badge } from "@/components/base/badges/badges";
import { TaxonomyTags } from "@/components/board/taxonomy-tags";
import { Text } from "@/components/text";
import { cx } from "@/utils/cx";
/**
 * One job as an Untitled UI card (CAV-485, row layout CAV-497) — PURE
 * MARKUP over `JobCardVM` (ADR-0070 Layer 2). Every value is pre-resolved
 * by `toJobCardVM`; this file imports nothing from `@cavuno/board*`, so the
 * card is restyled/recomposed as pure markup over the stable VM contract.
 *
 * Two layouts on one card system:
 *  - `card` — the vertical grid tile (home rails, related-jobs grids).
 *  - `row` — the Lumen-style horizontal listing row: logo left, company +
 *    title + summary + pills in the middle, the relative posted date on
 *    the right edge. The listing surfaces (/jobs, programmatic) use rows.
 *
 * Stock UUI card shape either way: rounded-xl surface, secondary_alt ring,
 * xs shadow lifting to md on hover. A featured job earns the brand ring +
 * a brand FEATURED pill inside the same card system.
 *
 * Real-data stress fixes preserved: 2-line title clamp with a min-height
 * so card rhythm holds across a grid (S1); honest 2-line summary or
 * omitted (S2/S6); salary/location line omitted when the VM has none
 * (never an empty label); skill tags capped at 3 with an honest overflow
 * count (S4); company mark falls back to initials when no logo (S3/S5).
 */
import type { JobCardVM } from "@/board/job-view-model";

const MAX_TAG_BADGES = 3;

/** Two-letter company initials for the avatar fallback. */
function initialsOf(name: string) {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => word[0]!)
            .slice(0, 2)
            .join("")
            .toUpperCase() || undefined
    );
}

/** The SEO-load-bearing taxonomy chips — the collection Tag's visual as links. */
function TagBadges({ vm }: { vm: JobCardVM }) {
    if (vm.tags.length === 0) return null;

    // Taxonomy chips stay LINKS — the internal-linking spine into the
    // programmatic /jobs/skills|categories pages (SEO-load-bearing) — and
    // keep the honest +N overflow for the tags beyond the cap.
    return (
        <TaxonomyTags
            chips={vm.tags.slice(0, MAX_TAG_BADGES).map((tag) => ({ key: tag.key, name: tag.name, href: tag.href }))}
            overflow={Math.max(0, vm.tags.length - MAX_TAG_BADGES)}
            size="sm"
        />
    );
}

export function JobCard({
    vm,
    action,
    layout = "card",
    compact = false,
}: {
    vm: JobCardVM;
    /** Optional trailing slot (e.g. a save/unsave control). */
    action?: React.ReactNode;
    /** `card` — vertical grid tile; `row` — horizontal listing row. */
    layout?: "card" | "row";
    /**
     * Lean card variant (the similar-jobs rail): company + title + the
     * salary/meta line only — no summary, no tag pills, tighter padding —
     * so a stack of these reads compactly in the narrow right column.
     */
    compact?: boolean;
}) {
    const title =
        vm.companySlug && vm.jobSlug ? (
            <Link
                to="/companies/$companySlug/jobs/$jobSlug"
                params={{ companySlug: vm.companySlug, jobSlug: vm.jobSlug }}
                className="rounded-xs text-primary outline-focus-ring transition-colors hover:text-brand-secondary hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                {vm.title}
            </Link>
        ) : (
            <span className="text-primary">{vm.title}</span>
        );

    const surface = cx(
        "group rounded-xl bg-primary shadow-xs ring-1 transition duration-100 ease-linear hover:shadow-md",
        vm.isFeatured ? "ring-2 ring-brand" : "ring-secondary_alt",
    );

    if (layout === "row") {
        return (
            <article className={cx(surface, "flex items-start gap-4 p-5 md:p-6")}>
                <Avatar
                    size="lg"
                    rounded={false}
                    src={vm.companyLogoUrl}
                    initials={initialsOf(vm.companyAvatarName)}
                    alt={vm.companyName ?? vm.title}
                    className="mt-0.5 hidden sm:flex"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <Avatar
                            size="xs"
                            rounded={false}
                            src={vm.companyLogoUrl}
                            initials={initialsOf(vm.companyAvatarName)}
                            alt={vm.companyName ?? vm.title}
                            className="sm:hidden"
                        />
                        {vm.companyName ? (
                            <p className="truncate text-sm font-semibold text-secondary">{vm.companyName}</p>
                        ) : null}
                        {vm.isFeatured ? (
                            <Badge type="pill-color" color="brand" size="sm">
                                {vm.featuredLabel}
                            </Badge>
                        ) : null}
                    </div>
                    <Text as="h3" variant="heading4" className="line-clamp-2">{title}</Text>
                    {vm.summary ? <p className="line-clamp-2 text-sm text-tertiary">{vm.summary}</p> : null}
                    {vm.compLine ? <p className="text-sm font-medium text-secondary">{vm.compLine}</p> : null}
                    <div className="mt-1.5">
                        <TagBadges vm={vm} />
                    </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                    {vm.postedAtLabel ? (
                        <p className="text-sm whitespace-nowrap text-tertiary">{vm.postedAtLabel}</p>
                    ) : null}
                    {action ? <span>{action}</span> : null}
                </div>
            </article>
        );
    }

    return (
        <article className={cx(surface, "flex h-full flex-col", compact ? "p-4" : "p-5")}>
            <div className={cx("flex items-center gap-3", compact ? "mb-3" : "mb-4")}>
                <Avatar
                    size={compact ? "sm" : "md"}
                    rounded={false}
                    src={vm.companyLogoUrl}
                    initials={initialsOf(vm.companyAvatarName)}
                    alt={vm.companyName ?? vm.title}
                />
                <div className="min-w-0 flex-1">
                    {vm.companyName ? <p className="truncate text-sm font-semibold text-primary">{vm.companyName}</p> : null}
                    {vm.sector && !compact ? <p className="truncate text-sm text-tertiary">{vm.sector}</p> : null}
                </div>
                {vm.isFeatured ? (
                    <Badge type="pill-color" color="brand" size="sm">
                        {vm.featuredLabel}
                    </Badge>
                ) : null}
                {action ? <span className="shrink-0">{action}</span> : null}
            </div>

            <Text as="h3" variant="heading4" className={cx("line-clamp-2", !compact && "min-h-[2.5em]")}>{title}</Text>

            {vm.summary && !compact ? <p className="mt-1.5 line-clamp-2 text-sm text-tertiary">{vm.summary}</p> : null}

            {vm.compLine ? (
                <p className={cx("text-sm font-medium text-secondary", compact ? "mt-1.5" : "mt-3")}>{vm.compLine}</p>
            ) : null}

            {compact ? null : (
                <div className="mt-4 empty:hidden">
                    <TagBadges vm={vm} />
                </div>
            )}
        </article>
    );
}
