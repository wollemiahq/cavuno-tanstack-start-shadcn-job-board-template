import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { PageBreadcrumb } from "@/components/board/breadcrumb";
import { PageBody } from "@/components/board/page-body";
import { TaxonomyTags } from "@/components/board/taxonomy-tags";
import { Prose } from "@/components/prose";
import { Text } from "@/components/text";
/**
 * Job detail page — recomposed as an Untitled UI page (CAV-486, "as
 * Jordan Hughes would design it"). PURE MARKUP over `JobDetailVM`
 * (ADR-0070 Layer 2): every value is pre-resolved by `toJobDetailVM`
 * (src/board/job-detail-view-model.ts), so this file imports nothing
 * from `@cavuno/board*` and the design is free to restructure without
 * touching the data/correctness layer.
 *
 * Anatomy: breadcrumbs → page header (company avatar + name link, display
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
} from "@/board/job-detail-view-model";

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

function TaxonomySection({ heading, chips }: { heading: string; chips: JobDetailChipVM[] }) {
    if (chips.length === 0) return null;
    return (
        <section aria-label={heading} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-secondary">{heading}</h2>
            {/* Taxonomy chips carry the collection Tag's visual on real
                anchors, kept as LINKS — the internal-linking spine into the
                programmatic /jobs/skills|categories pages (SEO-load-bearing). */}
            <TaxonomyTags chips={chips} size="md" />
        </section>
    );
}

function DefinitionList({ rows }: { rows: { label: string; value: string }[] }) {
    return (
        <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[max-content_1fr]">
            {rows.map((row) => (
                <div key={row.label} className="contents">
                    <dt className="text-sm font-medium text-tertiary">{row.label}</dt>
                    <dd className="text-sm text-secondary">{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}

function JobFacts({ facts }: { facts: JobDetailFactVM[] }) {
    if (facts.length === 0) return null;
    return <DefinitionList rows={facts} />;
}

function CustomFields({ fields, heading }: { fields: JobDetailCustomFieldVM[]; heading: string }) {
    if (fields.length === 0) return null;
    return (
        <section aria-label={heading} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-secondary">{heading}</h2>
            <DefinitionList rows={fields} />
        </section>
    );
}

/** Compact company card inside the apply rail: avatar, name, sector, link. */

/** The full detail page assembly, recomposed in Untitled UI page anatomy. */
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
        <article>
            <PageBody
                // Full-bleed gray header band (Lumen structure, CAV-497/502) —
                // breadcrumbs + the page header ride the band; the two-column
                // body (prose + sticky apply rail) stays below on white.
                band={
                    <div className="border-b border-secondary bg-secondary">
                        {/* Trail hugs the nav (pt-4/5) via the SHARED PageBreadcrumb
                            placement primitive — same seam as the listing bands and
                            the band-less pages (CAV-511). */}
                        <PageBreadcrumb items={vm.breadcrumbs} ariaLabel={vm.breadcrumbAriaLabel} />
                        <div className="mx-auto flex w-full max-w-container flex-col px-4 pt-6 pb-8 md:px-8 md:pb-10">
                            <header className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        size="lg"
                                        rounded={false}
                                        src={vm.companyLogoUrl}
                                        initials={initialsOf(vm.companyAvatarName)}
                                        alt={vm.companyName ?? vm.title}
                                    />
                                    {vm.company?.href && vm.companyName ? (
                                        <Button color="link-color" size="md" href={vm.company.href}>
                                            {vm.companyName}
                                        </Button>
                                    ) : vm.companyName ? (
                                        <span className="text-md font-semibold text-primary">{vm.companyName}</span>
                                    ) : null}
                                </div>

                                <Text as="h1" variant="heading2" className="md:text-display-sm">
                                    {vm.title}
                                </Text>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    {vm.employmentTypeLabel ? (
                                        <Badge type="pill-color" color="gray" size="md">
                                            {vm.employmentTypeLabel}
                                        </Badge>
                                    ) : null}
                                    {vm.seniorityLabel ? (
                                        <Badge type="pill-color" color="gray" size="md">
                                            {vm.seniorityLabel}
                                        </Badge>
                                    ) : null}
                                    <Badge type="pill-color" color="gray" size="md">
                                        {vm.locationLabel}
                                    </Badge>
                                </div>

                                {/* Salary rides the header as a prominent meta line (CAV-500). */}
                                {vm.salaryLabel ? (
                                    <p className="text-lg font-semibold text-primary">{vm.salaryLabel}</p>
                                ) : null}

                                {vm.publishedLabel ? (
                                    <p className="text-sm text-tertiary">{vm.publishedLabel}</p>
                                ) : null}
                            </header>
                        </div>
                    </div>
                }
                // Apply rail — right column on desktop; first on mobile so the
                // apply CTA sits directly under the header.
                rail={
                    <>
                        <div className="flex flex-col gap-4 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary_alt">
                            {applySlot ? <div className="flex flex-col gap-2">{applySlot}</div> : null}
                            {secondaryActions ? <div className="flex flex-col gap-2">{secondaryActions}</div> : null}
                        </div>
                        {/* Similar jobs sit directly under the apply card (CAV-500). */}
                        {similarSlot ? (
                            <section aria-label={vm.similarJobsHeading} className="flex flex-col gap-4">
                                <Text as="h2" variant="heading4">{vm.similarJobsHeading}</Text>
                                {similarSlot}
                            </section>
                        ) : null}
                    </>
                }
            >
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
                    <p className="text-tertiary">{vm.noDescriptionText}</p>
                )}

                <JobFacts facts={vm.facts} />

                <TaxonomySection heading={vm.categoriesHeading} chips={vm.categoryChips} />
                <TaxonomySection heading={vm.skillsHeading} chips={vm.skillChips} />

                <CustomFields fields={vm.customFields} heading={vm.additionalDetailsHeading} />

                {alertSlot}
            </PageBody>
        </article>
    );
}
