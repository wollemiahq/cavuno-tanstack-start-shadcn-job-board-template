import { Link } from '@tanstack/react-router';

/**
 * One job as an owned shadcn card (CAV-485, row layout CAV-497) — PURE
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
 * The same card shape is used either way: rounded surface, subtle ring and
 * shadow lifting on hover. A featured job earns the primary ring + pill.
 *
 * Real-data stress fixes preserved: 2-line title clamp with a min-height
 * so card rhythm holds across a grid (S1); honest 2-line summary or
 * omitted (S2/S6); salary/location line omitted when the VM has none
 * (never an empty label); skill tags capped at 3 with an honest overflow
 * count (S4); company mark falls back to initials when no logo (S3/S5).
 */
import type { JobCardVM } from '@/board/job-view-model';
import { TaxonomyTags } from '@/components/board/taxonomy-tags';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { clampList } from '@/lib/clamp-list';
import { initialsOf } from '@/lib/initials';
import { cn } from '@/lib/utils';

const MAX_TAG_BADGES = 3;

function CompanyAvatar({
  vm,
  size,
  className,
}: {
  vm: JobCardVM;
  size: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  return (
    <Avatar size={size} className={cn('', className)}>
      {vm.companyLogoUrl ? (
        <AvatarImage src={vm.companyLogoUrl} alt={vm.companyName ?? vm.title} />
      ) : null}
      <AvatarFallback className="font-semibold">
        {initialsOf(vm.companyAvatarName)}
      </AvatarFallback>
    </Avatar>
  );
}

/** The SEO-load-bearing taxonomy chips — the collection Tag's visual as links. */
function TagBadges({ vm }: { vm: JobCardVM }) {
  if (vm.tags.length === 0) return null;

  // Taxonomy chips stay LINKS — the internal-linking spine into the
  // programmatic /jobs/skills|categories pages (SEO-load-bearing) — and
  // keep the honest +N overflow for the tags beyond the cap (shared clamp).
  const { visible, overflow } = clampList(vm.tags, MAX_TAG_BADGES);
  return (
    <TaxonomyTags
      chips={visible.map((tag) => ({
        key: tag.key,
        name: tag.name,
        href: tag.href,
      }))}
      overflow={overflow}
      size="sm"
    />
  );
}

export function JobCard({
  vm,
  action,
  layout = 'card',
  compact = false,
}: {
  vm: JobCardVM;
  /** Optional trailing slot (e.g. a save/unsave control). */
  action?: React.ReactNode;
  /** `card` — vertical grid tile; `row` — horizontal listing row. */
  layout?: 'card' | 'row';
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
        className="text-foreground hover:text-primary focus-visible:outline-ring rounded-sm transition-colors hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {vm.title}
      </Link>
    ) : (
      <span className="text-foreground">{vm.title}</span>
    );

  const surface = cn(
    'group gap-0 py-0 transition-shadow duration-100 ease-linear hover:shadow-md',
    vm.isFeatured && 'ring-primary dark:ring-primary ring-2',
  );

  if (layout === 'row') {
    return (
      <article>
        <Card className={surface}>
          <CardContent className="flex items-start gap-4 p-5 md:p-6">
            <CompanyAvatar
              vm={vm}
              size="lg"
              className="mt-0.5 hidden size-12 sm:flex"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <CompanyAvatar vm={vm} size="sm" className="sm:hidden" />
                {vm.companyName ? (
                  <p className="text-foreground truncate text-sm font-semibold">
                    {vm.companyName}
                  </p>
                ) : null}
                {vm.isFeatured ? <Badge>{vm.featuredLabel}</Badge> : null}
              </div>
              <h3 className="font-heading line-clamp-2 text-lg font-semibold tracking-tight">
                {title}
              </h3>
              {vm.summary ? (
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {vm.summary}
                </p>
              ) : null}
              {vm.compLine ? (
                <p className="text-foreground text-sm font-medium">
                  {vm.compLine}
                </p>
              ) : null}
              <div className="mt-1.5">
                <TagBadges vm={vm} />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {vm.postedAtLabel ? (
                <p className="text-muted-foreground text-sm whitespace-nowrap">
                  {vm.postedAtLabel}
                </p>
              ) : null}
              {action ? <span>{action}</span> : null}
            </div>
          </CardContent>
        </Card>
      </article>
    );
  }

  return (
    <article className="h-full">
      <Card size={compact ? 'sm' : 'default'} className={cn(surface, 'h-full')}>
        <CardContent
          className={cn('flex h-full flex-col', compact ? 'p-4' : 'p-5')}
        >
          <div
            className={cn('flex items-center gap-3', compact ? 'mb-3' : 'mb-4')}
          >
            <CompanyAvatar vm={vm} size={compact ? 'default' : 'lg'} />
            <div className="min-w-0 flex-1">
              {vm.companyName ? (
                <p className="text-foreground truncate text-sm font-semibold">
                  {vm.companyName}
                </p>
              ) : null}
              {vm.sector && !compact ? (
                <p className="text-muted-foreground truncate text-sm">
                  {vm.sector}
                </p>
              ) : null}
            </div>
            {vm.isFeatured ? <Badge>{vm.featuredLabel}</Badge> : null}
            {action ? <span className="shrink-0">{action}</span> : null}
          </div>

          <h3
            className={cn(
              'font-heading line-clamp-2 text-lg font-semibold tracking-tight',
              !compact && 'min-h-[2.5em]',
            )}
          >
            {title}
          </h3>

          {vm.summary && !compact ? (
            <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm">
              {vm.summary}
            </p>
          ) : null}

          {vm.compLine ? (
            <p
              className={cn(
                'text-foreground text-sm font-medium',
                compact ? 'mt-1.5' : 'mt-3',
              )}
            >
              {vm.compLine}
            </p>
          ) : null}

          {compact ? null : (
            <div className="mt-4 empty:hidden">
              <TagBadges vm={vm} />
            </div>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
