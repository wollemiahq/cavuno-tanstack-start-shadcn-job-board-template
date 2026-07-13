"use client";

import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { PageBreadcrumb } from "@/components/board/breadcrumb";
import { PageBody } from "@/components/board/page-body";
import { Text } from "@/components/text";
import { cx } from "@/utils/cx";
import { m } from "../../paraglide/messages";

import type { BreadcrumbData } from "@/components/board/breadcrumb";

/**
 * The company section shell (CAV-512). A company's three public surfaces —
 * profile (`/companies/:slug`), the jobs subpage (`…/jobs`), and the salary
 * overview (`…/salaries`) — read as ONE entity by opening every one with THIS
 * byte-identical header, seated in a full-bleed gray band: the breadcrumb, the
 * company mark + name (H1) + one-line description, then a row of section tabs.
 * The band is the SAME composition as the job-detail page (`PageBody`'s `band`
 * slot, `bg-secondary` + `border-b`, a `PageBreadcrumb` at the top) so the two
 * top sections feel like the same component. Only the content BELOW the tabs,
 * on the white surface, changes per surface.
 *
 * Codified design rule (operator review, baked into
 * docs/patterns/company-section.md): "The trail locates the entity; the tabs
 * navigate within it." The visible breadcrumb ends at the ENTITY — Home →
 * Companies → {Company} — IDENTICAL across all three tabs; the section is NEVER
 * appended as a final crumb. The tab row alone communicates the active section.
 * The company name in both the crumb (a link) and the H1 (identity) is correct.
 *
 * The breadcrumb is seated at the TOP of the band via the shared
 * `PageBreadcrumb` placement primitive — the SAME band seam as `JobDetail`
 * (the pattern-contract gate lists this shell among the sanctioned band
 * owners). Routes pass the resolved trail DATA; the shell never receives
 * hand-placed trail markup.
 */

export type CompanySection = "overview" | "jobs" | "salaries";

/** Two-letter company initials for the avatar fallback (mirrors JobCard). */
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

/** Flatten the API's (pre-sanitized) description HTML to a trimmed text line. */
function toPlainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tab visual = the vendored Untitled UI underline tab (`application/tabs`,
 * `type="underline"`, `md`) applied to REAL anchors. The vendored react-aria
 * `Tabs` render `role="tab"` triggers over JS-only `TabPanel`s and emit NO
 * `<a href>` — the same role=grid trap TaxonomyTags documented for `Tag` — so
 * they would break the section-nav internal-linking spine that must stay
 * crawlable. So the tabs carry the underline visual on the typed router-seam
 * `Link` (a genuine anchor); the ACTIVE tab is the current, unlinked label.
 */
const tabBase =
  "relative -mb-px flex items-center gap-1.5 rounded-none border-b-2 px-0.5 pb-2.5 text-md font-semibold whitespace-nowrap outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:-outline-offset-2";
const tabActive = "border-fg-brand-primary_alt text-brand-secondary";
const tabInactive =
  "border-transparent text-quaternary hover:border-fg-brand-primary_alt hover:text-brand-secondary hover:no-underline";

/** The label + optional count Badge inside a tab (mirrors the UUI Tab body). */
function TabInner({ label, count, active }: { label: string; count?: number; active: boolean }) {
  return (
    <span className="flex items-center gap-1.5 px-0.5">
      {label}
      {count != null ? (
        <Badge size="sm" type="pill-color" color={active ? "brand" : "gray"} className="-my-px">
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
      className="flex gap-4 border-b border-secondary"
    >
      {active === "overview" ? (
        <span aria-current="page" className={cx(tabBase, tabActive)}>
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
          className={cx(tabBase, tabInactive)}
        >
          <TabInner label={m.companyTabs_overview()} active={false} />
        </Link>
      )}

      {active === "jobs" ? (
        <span aria-current="page" className={cx(tabBase, tabActive)}>
          <TabInner label={m.companyTabs_jobs()} count={jobCount} active />
        </span>
      ) : (
        <Link
          to="/companies/$companySlug/jobs"
          params={{ companySlug }}
          activeOptions={{ exact: true }}
          className={cx(tabBase, tabInactive)}
        >
          <TabInner label={m.companyTabs_jobs()} count={jobCount} active={false} />
        </Link>
      )}

      {hasSalaries ? (
        active === "salaries" ? (
          <span aria-current="page" className={cx(tabBase, tabActive)}>
            <TabInner label={m.companyTabs_salaries()} active />
          </span>
        ) : (
          <Link
            to="/companies/$companySlug/salaries"
            params={{ companySlug }}
            activeOptions={{ exact: true }}
            className={cx(tabBase, tabInactive)}
          >
            <TabInner label={m.companyTabs_salaries()} active={false} />
          </Link>
        )
      ) : null}
    </nav>
  );
}

export function CompanySectionShell({
  breadcrumb,
  company,
  activeSection,
  jobCount,
  hasSalaries,
  children,
}: {
  /** The resolved trail — Home → Companies → {Company}, identical per section. */
  breadcrumb: BreadcrumbData;
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
  const descriptionText = company.description ? toPlainText(company.description) : "";

  return (
    <PageBody
      // Full-bleed gray header band — the SAME composition as the job-detail
      // page (CAV-497/502): the breadcrumb + the shared company header + the
      // tab row ride the band; the per-section content stays below on white.
      band={
        <div className="border-b border-secondary bg-secondary">
          {/* Trail hugs the nav (pt-4/5) via the SHARED PageBreadcrumb
              placement primitive — same seam as the job-detail band. */}
          <PageBreadcrumb items={breadcrumb.items} ariaLabel={breadcrumb.ariaLabel} />
          {/* Generous vertical rhythm matching the job-detail hero (pt-8
              md:pt-10 + gap-8) so the band feels spacious, NOT cramped. The
              header + tabs still sit flush at the band's bottom (no pb), so the
              tab row's border-b aligns with the band border (the active
              underline lands on it). Byte-identical header across sections. */}
          <div className="mx-auto flex w-full max-w-container flex-col gap-8 px-4 pt-8 md:px-8 md:pt-10">
            <header className="flex items-start gap-4">
              <Avatar
                size="xl"
                rounded={false}
                src={company.logoUrl}
                initials={initialsOf(company.name)}
                alt={company.name}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <Text as="h1" variant="heading2" className="md:text-display-sm">
                  {company.name}
                </Text>
                {descriptionText ? (
                  <p className="line-clamp-1 text-md text-tertiary">{descriptionText}</p>
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
        </div>
      }
    >
      {children}
    </PageBody>
  );
}
