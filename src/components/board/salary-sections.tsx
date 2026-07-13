import { ArrowRight, BarChartSquare02 } from "@untitledui/icons";
import { Link as AriaLink } from "react-aria-components";

import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Text } from "@/components/text";
import { cx } from "@/utils/cx";
/**
 * Salary sections — recomposed as Untitled UI compositions (CAV-488).
 * PURE MARKUP over the salary view-models (ADR-0070 Layer 2): every value
 * is pre-resolved by the mappers in `src/board/salary-view-model.ts`, so
 * this file imports nothing from `@cavuno/board*` or `#/copy` and the
 * design is free to restructure without touching the correctness layer.
 *
 * Anatomy: the overall figures render as stock UUI metric panels (label +
 * display value); the seniority breakdown as a clean UUI table with
 * tabular figures and an honest "—" where a baseline/diff is missing; the
 * top-companies/locations/skills/related rails as UUI link-cards (real
 * `AriaLink`s riding the router seam — the SEO internal-linking spine, never
 * static); the FAQ as ringed cards; and `SalaryEmptyState` gives no-data
 * pages an honest UUI empty state instead of an invented figure.
 */
import type {
  OverallSalaryVM,
  SalaryFaqVM,
  SalaryRailVM,
  SeniorityTableVM,
} from "@/board/salary-view-model";

export type { RailItem } from "@/board/salary-view-model";

/** Two-letter initials for the avatar fallback (mirrors JobCard/CompanyCard). */
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

/** One stock UUI metric panel: a ringed surface with a label + display value. */
function MetricPanel({
  label,
  value,
  suffix,
  emphasis,
}: {
  label: string;
  value: string;
  /** Trailing unit (e.g. "/ yr") rendered small next to the headline value. */
  suffix?: string;
  /** The key figure (median) is drawn in the brand color. */
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl bg-primary p-5 ring-1 ring-secondary_alt">
      <p className="text-sm text-tertiary">{label}</p>
      <p className={cx("mt-1 text-display-xs font-semibold tabular-nums", emphasis ? "text-brand-secondary" : "text-primary")}>
        {value}
        {suffix ? <span className="ml-1.5 text-md font-normal text-tertiary">{suffix}</span> : null}
      </p>
    </div>
  );
}

export function OverallSalaryCard({ vm }: { vm: OverallSalaryVM }) {
  return (
    <section className="flex flex-col gap-4">
      <MetricPanel label={vm.headlineLabel} value={vm.headlineValue} suffix={vm.perYearSuffix} />
      {vm.stats.length > 0 ? (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {vm.stats.map((stat) => (
            <MetricPanel key={stat.label} label={stat.label} value={stat.value} emphasis={stat.emphasis} />
          ))}
        </dl>
      ) : null}
    </section>
  );
}

export function SenioritySalaryTable({ vm }: { vm: SeniorityTableVM }) {
  if (vm.rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl bg-primary ring-1 ring-secondary_alt">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-secondary text-left">
              <th className="px-4 py-3 text-xs font-medium tracking-wide text-tertiary uppercase">{vm.headers.level}</th>
              <th className="px-4 py-3 text-xs font-medium tracking-wide text-tertiary uppercase">{vm.headers.avg}</th>
              <th className="px-4 py-3 text-xs font-medium tracking-wide text-tertiary uppercase">{vm.headers.baseline}</th>
              <th className="px-4 py-3 text-xs font-medium tracking-wide text-tertiary uppercase">{vm.headers.diff}</th>
            </tr>
          </thead>
          <tbody>
            {vm.rows.map((r) => (
              <tr key={r.key} className="border-b border-secondary last:border-0">
                <td className="px-4 py-3 font-medium text-primary capitalize">{r.level}</td>
                <td className="px-4 py-3 tabular-nums text-secondary">{r.avg}</td>
                <td className="px-4 py-3 tabular-nums text-tertiary">{r.baseline}</td>
                <td className="px-4 py-3 tabular-nums">
                  {r.diff ? (
                    <span className={r.diff.positive ? "text-success-primary" : "text-tertiary"}>{r.diff.text}</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SalaryRail({ vm }: { vm: SalaryRailVM }) {
  if (vm.items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      {vm.title ? <Text as="h2" variant="heading4">{vm.title}</Text> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vm.items.map((item) => (
          // Real link riding the router seam — the SEO internal-linking spine
          // into the salary/company pages (load-bearing, never static text).
          <AriaLink
            key={item.href}
            href={item.href}
            className="group flex flex-col rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary_alt outline-focus-ring transition duration-100 ease-linear hover:shadow-md hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="flex items-center gap-3">
              <Avatar size="md" rounded={false} src={item.logoPath} initials={initialsOf(item.name)} alt={item.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-primary transition-colors group-hover:text-brand-secondary">{item.name}</p>
                <p className="mt-0.5 truncate text-sm text-tertiary tabular-nums">{item.jobCountLabel}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-secondary tabular-nums">{item.range}</p>
          </AriaLink>
        ))}
      </div>
    </section>
  );
}

/**
 * The Overview-tab salary summary (CAV-516). The company Overview reads as a
 * page of section summaries — it previews the company's jobs, and THIS block
 * condenses the Salaries tab into the same rhythm: a titled "Salaries" section
 * with the company's overall salary range (`OverallSalaryCard`) + a few top
 * category rows (`SalaryRail`) + a "View salaries" link deferring to the full
 * Salaries tab. It composes the existing salary display components — no new
 * salary markup — so a restyle of the salary sections flows through here too.
 */
export function CompanySalarySummary({
  title,
  overall,
  categories,
  viewAllHref,
  viewAllLabel,
}: {
  /** The section title (mirrors the jobs-preview heading rhythm). */
  title: string;
  /**
   * The overall salary range card VM — null when the company has per-category
   * rows but no overall aggregate (the same state the tab gate allows), in
   * which case only the category rows render.
   */
  overall: OverallSalaryVM | null;
  /** The (already top-N-capped) category rows VM. */
  categories: SalaryRailVM;
  /** The salaries-tab href the "View salaries" CTA links to. */
  viewAllHref: string;
  /** The localized "View salaries" CTA label. */
  viewAllLabel: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h2" variant="heading4">
          {title}
        </Text>
        <Button color="link-color" size="sm" href={viewAllHref} iconTrailing={ArrowRight}>
          {viewAllLabel}
        </Button>
      </div>
      {overall ? <OverallSalaryCard vm={overall} /> : null}
      <SalaryRail vm={categories} />
    </section>
  );
}

export function SalaryFaq({ vm }: { vm: SalaryFaqVM }) {
  if (vm.items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <Text as="h2" variant="heading4">{vm.heading}</Text>
      <dl className="flex flex-col gap-3">
        {vm.items.map((f) => (
          <div key={f.q} className="rounded-xl bg-primary p-5 ring-1 ring-secondary_alt">
            <dt className="text-sm font-semibold text-primary">{f.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-tertiary">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * No-data / not-found state for the salary route family — the stock UUI
 * `EmptyState` so a page with no salary figures reads as an honest omission
 * (never an invented number). The route supplies the already-localized
 * title and optional description copy.
 */
export function SalaryEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <EmptyState size="sm" className="py-12">
      <EmptyState.Header>
        <EmptyState.FeaturedIcon icon={BarChartSquare02} color="gray" theme="modern" />
      </EmptyState.Header>
      <EmptyState.Content>
        <EmptyState.Title>{title}</EmptyState.Title>
        {description ? <EmptyState.Description>{description}</EmptyState.Description> : null}
      </EmptyState.Content>
    </EmptyState>
  );
}
