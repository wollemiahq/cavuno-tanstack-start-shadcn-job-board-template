import { Link } from '@tanstack/react-router';

/**
 * One job as owned shadcn markup over `JobCardVM`. Every value is pre-resolved
 * by `toJobCardVM`; this file imports nothing from `@cavuno/board*`, so the
 * card is restyled/recomposed as pure markup over the stable VM contract.
 *
 * Two layouts on one card system:
 *  - `card` — the vertical grid tile (home rails, related-jobs grids). Its
 *    element order mirrors the /jobs workspace result card (JobSearchResult):
 *    avatar alongside TITLE → company → location → salary → description →
 *    footer (posted date + tags/action), so the two surfaces read identically.
 *  - `row` — the horizontal listing row: logo left, company +
 *    title + summary + pills in the middle, the relative posted date on
 *    the right edge. The listing surfaces (/jobs, programmatic) use rows.
 *
 * The same card shape is used either way: rounded surface, subtle ring and
 * shadow lifting on hover. A featured job earns the primary ring + pill.
 *
 * Real-data constraints: two-line title clamp; two-line summary or omission;
 * salary omitted when the VM has none; skill tags capped at three with an
 * honest overflow count; and company initials when no logo exists. The title +
 * company read as one tight lockup — no reserved title height — with card
 * bottoms aligned across a grid row via `h-full` + the `mt-auto` footer.
 */
import type { JobCardVM } from '@/board/job-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { TaxonomyTags } from '@/components/board/taxonomy-tags';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { clampList } from '@/lib/clamp-list';
import { cn } from '@/lib/utils';

const MAX_TAG_BADGES = 3;

/** The SEO-load-bearing taxonomy chips — the collection Tag's visual as links. */
function TagBadges({
  vm,
  openInNewTab = false,
}: {
  vm: JobCardVM;
  openInNewTab?: boolean;
}) {
  if (vm.tags.length === 0) return null;

  // Taxonomy chips stay LINKS — the internal-linking spine into the
  // programmatic /jobs/skills|categories pages (SEO-load-bearing) — and
  // keep the honest +N overflow for the tags beyond the cap (shared clamp).
  const { visible, overflow } = clampList(vm.tags, MAX_TAG_BADGES);
  return (
    // `relative z-10` lifts the chips above the title link's stretched
    // overlay so they stay clickable inside the fully-clickable card.
    <TaxonomyTags
      className="relative z-10"
      chips={visible.map((tag) => ({
        key: tag.key,
        name: tag.name,
        href: tag.href,
      }))}
      overflow={overflow}
      size="sm"
      openInNewTab={openInNewTab}
    />
  );
}

export function JobCard({
  vm,
  action,
  layout = 'card',
  compact = false,
  linkTo = 'detail',
  openInNewTab = false,
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
  /**
   * Where the card's title links. `detail` (default) opens the standalone
   * job page; `workspace` opens the `/jobs` two-pane listing with this job
   * preselected in the detail pane (via the `selectedJob` search param) — so
   * a homepage rail lands the visitor in the browsing context. Both are typed
   * TanStack routes; the canonical job URL for SEO/JSON-LD is emitted by the
   * route, never derived from this anchor.
   */
  linkTo?: 'detail' | 'workspace';
  /**
   * Embed widgets pass true so title + taxonomy chips leave the iframe
   * instead of loading the board inside it.
   */
  openInNewTab?: boolean;
}) {
  const linkClassName =
    // The `after` overlay stretches the title anchor over the whole card,
    // making the full surface clickable with a single accessible link.
    'text-foreground hover:text-primary focus-visible:ring-ring/50 rounded-sm outline-none transition-colors hover:no-underline focus-visible:ring-2 after:absolute after:inset-0';
  const newTabProps = openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};
  const title =
    vm.companySlug && vm.jobSlug ? (
      linkTo === 'workspace' ? (
        <Link
          to="/jobs"
          search={{ selectedJob: vm.jobSlug }}
          className={linkClassName}
          {...newTabProps}
        >
          {vm.title}
        </Link>
      ) : (
        <Link
          to="/companies/$companySlug/jobs/$jobSlug"
          params={{ companySlug: vm.companySlug, jobSlug: vm.jobSlug }}
          className={linkClassName}
          {...newTabProps}
        >
          {vm.title}
        </Link>
      )
    ) : (
      <span className="text-foreground" dir="auto">
        {vm.title}
      </span>
    );

  const surface = cn(
    'group relative gap-0 py-0 transition-shadow duration-100 ease-linear hover:shadow-md',
    vm.isFeatured && 'ring-primary/40 dark:ring-primary/40 ring-1',
  );

  if (layout === 'row') {
    return (
      <article>
        <Card className={surface}>
          <CardContent className="flex items-start gap-4 p-5 md:p-6">
            <CompanyAvatar
              name={vm.companyAvatarName}
              logoUrl={vm.companyLogoUrl}
              size="xl"
              className="mt-0.5 hidden sm:flex"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <CompanyAvatar
                  name={vm.companyAvatarName}
                  logoUrl={vm.companyLogoUrl}
                  size="sm"
                  className="sm:hidden"
                />
                {vm.companyName ? (
                  <p
                    className="text-foreground truncate text-sm font-semibold"
                    dir="auto"
                  >
                    {vm.companyName}
                  </p>
                ) : null}
                {vm.isFeatured ? <Badge>{vm.featuredLabel}</Badge> : null}
              </div>
              <h3
                className="font-heading line-clamp-2 text-lg font-semibold tracking-tight"
                dir="auto"
              >
                {title}
              </h3>
              {vm.summary ? (
                <p
                  className="text-muted-foreground line-clamp-2 text-sm"
                  dir="auto"
                >
                  {vm.summary}
                </p>
              ) : null}
              {vm.compLine ? (
                <p className="text-foreground text-sm font-medium">
                  {vm.compLine}
                </p>
              ) : null}
              <div className="mt-1.5">
                <TagBadges vm={vm} openInNewTab={openInNewTab} />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {vm.postedAtLabel ? (
                <p className="text-muted-foreground text-sm whitespace-nowrap">
                  {vm.postedAtLabel}
                </p>
              ) : null}
              {action ? <span className="relative z-10">{action}</span> : null}
            </div>
          </CardContent>
        </Card>
      </article>
    );
  }

  // Tile order mirrors the /jobs workspace result card (JobSearchResult):
  // avatar alongside a column that reads TITLE → company → location → salary →
  // description → footer (posted date + tags/action). The location and salary
  // use the SAME VM fields the workspace renders, so the strings are identical
  // ("Worldwide (Remote)", not the old combined "Remote · Worldwide" line).
  return (
    <article className="h-full">
      <Card size={compact ? 'sm' : 'default'} className={cn(surface, 'h-full')}>
        <CardContent
          className={cn(
            'flex h-full items-start gap-3',
            compact ? 'p-4' : 'p-5',
          )}
        >
          <CompanyAvatar
            name={vm.companyAvatarName}
            logoUrl={vm.companyLogoUrl}
            size={compact ? 'default' : 'lg'}
          />
          {/* `self-stretch` makes the column fill the card's full height (the
              row is `items-start` to top-align the avatar), so the footer's
              `mt-auto` pins it to the bottom on short cards — footers align
              across a grid row. */}
          <div className="flex min-w-0 flex-1 flex-col self-stretch">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Title + company are one tight lockup: no reserved title
                    height (that opened a gap under 1-line titles), company
                    directly beneath in the bolder foreground weight the row
                    layout uses. */}
                <h3
                  className="font-heading line-clamp-2 text-lg font-semibold tracking-tight"
                  dir="auto"
                >
                  {title}
                </h3>
                {vm.companyName ? (
                  <p
                    className="text-foreground mt-0.5 truncate text-sm font-semibold"
                    dir="auto"
                  >
                    {vm.companyName}
                  </p>
                ) : null}
              </div>
              {vm.isFeatured ? (
                <Badge className="relative z-10 shrink-0">
                  {vm.featuredLabel}
                </Badge>
              ) : null}
            </div>

            {compact ? (
              vm.compLine ? (
                <p className="text-foreground mt-1.5 text-sm font-medium">
                  {vm.compLine}
                </p>
              ) : null
            ) : (
              <>
                <p className="text-muted-foreground mt-1 text-sm">
                  {vm.locationLabel}
                </p>
                {vm.salaryLabel ? (
                  <p className="text-foreground mt-2 text-sm font-medium">
                    {vm.salaryLabel}
                  </p>
                ) : null}
                {vm.summary ? (
                  <p
                    className="text-muted-foreground mt-2 line-clamp-2 text-sm"
                    dir="auto"
                  >
                    {vm.summary}
                  </p>
                ) : null}

                {vm.tags.length > 0 || vm.postedAtLabel || action ? (
                  <div className="mt-auto flex flex-col gap-3 pt-4">
                    <TagBadges vm={vm} openInNewTab={openInNewTab} />
                    {vm.postedAtLabel || action ? (
                      <div className="flex min-h-8 items-end justify-between gap-3">
                        {vm.postedAtLabel ? (
                          <p className="text-muted-foreground text-xs">
                            {vm.postedAtLabel}
                          </p>
                        ) : (
                          <span />
                        )}
                        {action ? (
                          <div className="relative z-10 shrink-0">{action}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
