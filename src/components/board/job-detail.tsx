/**
 * Job detail page — composed as an owned shadcn page (CAV-486,"as
 * Jordan Hughes would design it"). PURE MARKUP over `JobDetailVM`
 * (ADR-0070 Layer 2): every value is pre-resolved by `toJobDetailVM`
 * (src/board/job-detail-view-model.ts), so this file imports nothing
 * from `@cavuno/board*` and the design is free to restructure without
 * touching the data/correctness layer.
 *
 * Anatomy: page header (company avatar + name link, display
 * title, meta pills, posted date) → two-column body. The main column
 * carries the sanitized description prose, facts, taxonomy links, operator
 * custom fields, and the similar-jobs card grid; the sticky right rail is
 * the apply card (apply CTA, salary, save/copy controls, compact company
 * card). On mobile the apply card is ordered first — the CTA sits directly
 * under the header — while the description and similar jobs follow.
 *
 * Framework seams (owned by the route, need client interactivity):
 * - `applySlot` (native/external apply), `secondaryActions` (save +
 *   copy-link), `similarSlot` (the CAV-485 JobCard grid over the raw
 *   PublicJobCard[]), and `alertSlot` (the CAV-483 alert form).
 * - JSON-LD + head meta live in the route, never here.
 */
import type {
  JobDetailChipVM,
  JobDetailCustomFieldVM,
  JobDetailFactVM,
  JobDetailVM,
} from '@/board/job-detail-view-model';
import { JobAboutCompanyCard } from '@/components/board/job-about-company-card';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { PageBody } from '@/components/board/page-body';
import { TaxonomyTags } from '@/components/board/taxonomy-tags';
import { Container } from '@/components/layout/container';
import { Prose } from '@/components/prose';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { m } from '../../paraglide/messages';

function TaxonomySection({
  heading,
  chips,
}: {
  heading: string;
  chips: JobDetailChipVM[];
}) {
  if (chips.length === 0) return null;
  return (
    <section aria-label={heading} className="flex flex-col gap-2">
      <h2 className="text-foreground text-sm font-semibold">{heading}</h2>
      {/* Taxonomy chips carry the collection Tag's visual on real
                anchors, kept as LINKS — the internal-linking spine into the
                programmatic /jobs/skills|categories pages (SEO-load-bearing). */}
      <TaxonomyTags chips={chips} size="md" />
    </section>
  );
}

function DefinitionList({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[max-content_1fr]">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground text-sm font-medium">
            {row.label}
          </dt>
          <dd className="text-foreground text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function JobFacts({ facts }: { facts: JobDetailFactVM[] }) {
  if (facts.length === 0) return null;
  return <DefinitionList rows={facts} />;
}

function CustomFields({
  fields,
  heading,
}: {
  fields: JobDetailCustomFieldVM[];
  heading: string;
}) {
  if (fields.length === 0) return null;
  return (
    <section aria-label={heading} className="flex flex-col gap-2">
      <h2 className="text-foreground text-sm font-semibold">{heading}</h2>
      <DefinitionList rows={fields} />
    </section>
  );
}

/** Compact company card inside the apply rail: avatar, name, sector, link. */

/** The full detail page assembly, composed in the shared page anatomy. */
export function JobDetail({
  vm,
  applySlot,
  secondaryActions,
  similarSlot,
  alertSlot,
}: {
  vm: JobDetailVM;
  /** Native/external apply CTA — the route wires this (client interactivity). */
  applySlot?: React.ReactNode;
  /** Save control — the route wires this. */
  secondaryActions?: React.ReactNode;
  /** Compact copy-link utility — sits by the meta in the header (CAV-500). */
  /** Similar-jobs grid (the CAV-485 JobCard grid over PublicJobCard[]). */
  similarSlot?: React.ReactNode;
  /** Alert signup form (CAV-483) — the route wires this. */
  alertSlot?: React.ReactNode;
}) {
  return (
    <PageBody
      band={
        <div className="border-border bg-muted/50 border-b">
          <Container width="wide">
            <div className="flex flex-col pt-(--header-space) pb-(--header-space)">
              <header className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <CompanyAvatar
                    name={vm.companyAvatarName}
                    logoUrl={vm.companyLogoUrl}
                    size="lg"
                  />
                  {vm.company?.href && vm.companyName ? (
                    <a
                      href={vm.company.href}
                      className={buttonVariants({
                        variant: 'link',
                        size: 'sm',
                      })}
                    >
                      {vm.companyName}
                    </a>
                  ) : vm.companyName ? (
                    <span className="text-foreground text-base font-semibold">
                      {vm.companyName}
                    </span>
                  ) : null}
                </div>

                <Text as="h1" variant="heading2" className="md:text-3xl">
                  {vm.title}
                </Text>

                <div className="flex flex-wrap items-center gap-1.5">
                  {vm.salaryLabel ? (
                    <Badge variant="outline">{vm.salaryLabel}</Badge>
                  ) : null}
                  {vm.workplaceLabel ? (
                    <Badge variant="secondary">{vm.workplaceLabel}</Badge>
                  ) : null}
                  {vm.employmentTypeLabel ? (
                    <Badge variant="secondary">{vm.employmentTypeLabel}</Badge>
                  ) : null}
                  {vm.seniorityLabel ? (
                    <Badge variant="secondary">{vm.seniorityLabel}</Badge>
                  ) : null}
                </div>

                <p className="text-muted-foreground text-sm">
                  {vm.locationLabel ?? m.jobDetail_locationNotSpecifiedLabel()}
                  {vm.publishedLabel ? ` · ${vm.publishedLabel}` : null}
                </p>
              </header>
            </div>
          </Container>
        </div>
      }
      rail={
        <>
          <div
            data-slot="job-actions"
            className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t p-4 shadow-lg backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
          >
            <Card size="sm" className="gap-0 py-0">
              <CardContent className="grid grid-cols-2 gap-2 p-4 lg:flex lg:flex-col lg:gap-4">
                {applySlot ? (
                  <div className="flex flex-col gap-2">{applySlot}</div>
                ) : null}
                {secondaryActions ? (
                  <div className="flex flex-col gap-2">{secondaryActions}</div>
                ) : null}
              </CardContent>
            </Card>
          </div>
          {/* Similar jobs sit directly under the apply card (CAV-500). */}
          {similarSlot ? (
            <section
              aria-label={vm.similarJobsHeading}
              className="flex flex-col gap-4"
            >
              <Text as="h2" variant="heading4">
                {vm.similarJobsHeading}
              </Text>
              {similarSlot}
            </section>
          ) : null}
        </>
      }
      railLabel={m.jobDetail_sidebarAriaLabel()}
    >
      <article className="flex flex-col gap-8 pb-24 lg:pb-0">
        {vm.descriptionHtml ? (
          // TRUST BOUNDARY: the description is rendered as raw HTML.
          // The Cavuno Board API sanitizes it server-side (the same
          // sanitized HTML the hosted board renders), so it is safe
          // against a conformant backend. If you point this block at
          // a non-Cavuno or modified Board API, YOU own re-sanitizing
          // before it reaches here — never pipe it through another
          // parser/renderer.
          <Prose html={vm.descriptionHtml} />
        ) : (
          <p className="text-muted-foreground">{vm.noDescriptionText}</p>
        )}

        <JobFacts facts={vm.facts} />

        <TaxonomySection
          heading={vm.categoriesHeading}
          chips={vm.categoryChips}
        />
        <TaxonomySection heading={vm.skillsHeading} chips={vm.skillChips} />

        <CustomFields
          fields={vm.customFields}
          heading={vm.additionalDetailsHeading}
        />

        {vm.company ? <JobAboutCompanyCard company={vm.company} /> : null}

        {alertSlot}
      </article>
    </PageBody>
  );
}
