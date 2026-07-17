'use client';

import { Link } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';

import { PageBody } from '@/components/board/page-body';
import { Container } from '@/components/layout/container';
import { Text } from '@/components/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { initialsOf } from '@/lib/initials';
import { cn } from '@/lib/utils';

/**
 * The company section shell (CAV-512). A company's three public surfaces —
 * profile (`/companies/:slug`), the jobs subpage (`…/jobs`), and the salary
 * overview (`…/salaries`) — read as ONE entity by opening every one with THIS
 * byte-identical header, seated in a full-bleed gray band: the company mark +
 * name (H1) + one-line description, then a row of section tabs.
 * The band is the SAME composition as the job-detail page (`PageBody`'s `band`
 * slot, `bg-secondary` + `border-b`) so the two
 * top sections feel like the same component. Only the content BELOW the tabs,
 * on the white surface, changes per surface.
 *
 * The root shell renders the page trail once, immediately above the footer.
 */

export type CompanySection = 'overview' | 'jobs' | 'salaries';

/** Flatten the API's (pre-sanitized) description HTML to a trimmed text line. */
function toPlainText(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tab visual = the owned underline navigation treatment,
 * `type="underline"`, `md`) applied to REAL anchors. The vendored react-aria
 * tab primitives render `role="tab"` triggers over JS-only `TabPanel`s and emit NO
 * `<a href>` — the same role=grid trap TaxonomyTags documented for `Tag` — so
 * they would break the section-nav internal-linking spine that must stay
 * crawlable. The tabs therefore use owned theme tokens on the typed router-seam
 * `Link` (a genuine anchor); the ACTIVE tab is the current, unlinked label.
 */
const tabBase =
  'relative -mb-px flex items-center gap-1.5 rounded-none border-b-2 px-0.5 pb-2.5 text-base font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const tabActive = 'border-foreground text-foreground';
const tabInactive =
  'border-transparent text-muted-foreground hover:border-foreground hover:text-foreground hover:no-underline';

/** The label + optional owned Badge inside a tab. */
function TabInner({
  label,
  count,
  active,
}: {
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 px-0.5">
      {label}
      {count != null ? (
        <Badge variant={active ? 'default' : 'outline'} className="-my-px">
          {count}
        </Badge>
      ) : null}
    </span>
  );
}

/**
 * The section tab row — real crawlable anchors, active state derived from the
 * caller's `active` prop (the current route), the Jobs tab carrying the honest
 * company job count, and the Salaries tab present ONLY when the company has
 * salary data (`hasSalaries`).
 */
function CompanyTabs({
  active,
  companySlug,
  jobCount,
  hasSalaries,
}: {
  active: CompanySection;
  companySlug: string;
  jobCount: number;
  hasSalaries: boolean;
}) {
  return (
    <nav
      aria-label={m.companyTabs_navLabel()}
      className="border-border flex gap-4 border-b"
    >
      {active === 'overview' ? (
        <span aria-current="page" className={cn(tabBase, tabActive)}>
          <TabInner label={m.companyTabs_overview()} active />
        </span>
      ) : (
        // `exact` so the profile link is NOT auto-marked active on the nested
        // /jobs + /salaries routes (TanStack's default prefix match would give
        // the parent path a second `aria-current` + the active underline).
        <Link
          to="/companies/$companySlug"
          params={{ companySlug }}
          activeOptions={{ exact: true }}
          className={cn(tabBase, tabInactive)}
        >
          <TabInner label={m.companyTabs_overview()} active={false} />
        </Link>
      )}

      {active === 'jobs' ? (
        <span aria-current="page" className={cn(tabBase, tabActive)}>
          <TabInner label={m.companyTabs_jobs()} count={jobCount} active />
        </span>
      ) : (
        <Link
          to="/companies/$companySlug/jobs"
          params={{ companySlug }}
          activeOptions={{ exact: true }}
          className={cn(tabBase, tabInactive)}
        >
          <TabInner
            label={m.companyTabs_jobs()}
            count={jobCount}
            active={false}
          />
        </Link>
      )}

      {hasSalaries ? (
        active === 'salaries' ? (
          <span aria-current="page" className={cn(tabBase, tabActive)}>
            <TabInner label={m.companyTabs_salaries()} active />
          </span>
        ) : (
          <Link
            to="/companies/$companySlug/salaries"
            params={{ companySlug }}
            activeOptions={{ exact: true }}
            className={cn(tabBase, tabInactive)}
          >
            <TabInner label={m.companyTabs_salaries()} active={false} />
          </Link>
        )
      ) : null}
    </nav>
  );
}

export function CompanySectionShell({
  company,
  activeSection,
  jobCount,
  hasSalaries,
  children,
}: {
  company: {
    name: string;
    slug: string;
    logoUrl: string | null;
    /** Long-form company description (pre-sanitized HTML) or null. */
    description: string | null;
  };
  /** The active section, derived from the current route. */
  activeSection: CompanySection;
  /** The honest company job count shown on the Jobs tab Badge. */
  jobCount: number;
  /** Whether the company has salary data — gates the Salaries tab. */
  hasSalaries: boolean;
  /** The section content rendered below the tabs. */
  children: React.ReactNode;
}) {
  const descriptionText = company.description
    ? toPlainText(company.description)
    : '';

  return (
    <PageBody
      // Full-bleed gray header band — the SAME composition as the job-detail
      // page (CAV-497/502): the breadcrumb + the shared company header + the
      // tab row ride the band; the per-section content stays below on white.
      band={
        <div className="border-border bg-secondary border-b">
          {/* Top rhythm comes from the shared --header-space token, so this
              band, the job-detail hero, and every PageHeader start on the same
              line. Bottom padding is deliberately absent — the tab row sits
              flush at the band's bottom so its border-b aligns with the band
              border (the active underline lands on it). That flush edge is the
              one sanctioned exception to the shared header rhythm.
              Byte-identical header across sections. */}
          <Container width="wide">
            <div className="flex flex-col gap-8 pt-(--header-space)">
              <header className="flex items-start gap-4">
                <Avatar size="lg" className="size-12">
                  {company.logoUrl ? (
                    <AvatarImage src={company.logoUrl} alt={company.name} />
                  ) : null}
                  <AvatarFallback>{initialsOf(company.name)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-1">
                  <Text as="h1" variant="heading2" className="md:text-3xl">
                    {company.name}
                  </Text>
                  {descriptionText ? (
                    <p className="text-muted-foreground line-clamp-1 text-base">
                      {descriptionText}
                    </p>
                  ) : null}
                </div>
              </header>
              <CompanyTabs
                active={activeSection}
                companySlug={company.slug}
                jobCount={jobCount}
                hasSalaries={hasSalaries}
              />
            </div>
          </Container>
        </div>
      }
    >
      {children}
    </PageBody>
  );
}
