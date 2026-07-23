import type { ReactNode } from 'react';

/**
 * The condensed (sticky) detail header shared by ALL three master/detail
 * search surfaces — jobs, companies, and talent. Each detail panel used to
 * hand-roll its own sticky row, so they drifted apart (different borders,
 * paddings, and whether the name was even a link). This is the one row they
 * all render now: the entity mark, the entity NAME, an optional one-line
 * subtitle, and the primary action(s).
 *
 * The NAME links to that entity's own detail page when `nameHref` is set — a
 * job → its job-detail page, a company → its company page, a talent → their
 * `/p/{handle}` profile. The href is always a fully-resolved string from the
 * board view-model (never string-built here), so the component stays purely
 * presentational.
 *
 * Geometry contract — it is seated inside `SearchResultDetailHeader`'s sticky
 * `h-16` anchor, so its own box is a single flush row that matches the shared
 * results-column surface:
 *  - Left inset only (`pl-5 md:pl-6`); NO right padding, so the action(s) sit
 *    flush with the pane's right edge instead of leaving the asymmetric gap
 *    the results list just removed.
 *  - A subtle hairline divider (`border-border/60`) under the backdrop-blur —
 *    an intentional, quiet separator rather than a heavy full-strength rule.
 */
export function SearchDetailHeader({
  mark,
  name,
  nameHref,
  subtitle,
  actions,
}: {
  /** Entity mark — a `CompanyAvatar` (job/company) or the talent `Avatar`. */
  mark?: ReactNode;
  /** The entity name (plain text, or a skeleton node while loading). */
  name: ReactNode;
  /** When set, the name becomes a link to the entity's own detail page. */
  nameHref?: string | null;
  /** One-line supporting text under the name (company, headline, …). */
  subtitle?: ReactNode;
  /** The primary action control(s): Apply/Save, View jobs, Message, … */
  actions?: ReactNode;
}) {
  return (
    <header
      data-slot="search-detail-header"
      className="border-border/60 bg-background/95 flex h-16 min-w-0 items-center gap-3 border-b ps-5 backdrop-blur md:ps-6"
    >
      {mark ? <div className="shrink-0">{mark}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold" dir="auto">
          {nameHref ? (
            <a
              href={nameHref}
              className="outline-none hover:underline focus-visible:underline"
            >
              {name}
            </a>
          ) : (
            name
          )}
        </p>
        {subtitle ? (
          <p className="text-muted-foreground truncate text-sm" dir="auto">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          data-slot="search-detail-header-actions"
          className="flex shrink-0 items-center gap-2"
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
