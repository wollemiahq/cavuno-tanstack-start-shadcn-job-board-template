import type {
  JobDetailChipVM,
  JobDetailCustomFieldVM,
  JobDetailFactVM,
  JobDetailVM,
} from "@/board/job-detail-view-model";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Prose } from "@/components/prose";
import { Text } from "@/components/text";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || undefined
  );
}

function DefinitionList({ rows }: { rows: Array<JobDetailFactVM | JobDetailCustomFieldVM> }) {
  if (rows.length === 0) return null;

  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
      {rows.map((row) => (
        <div key={"key" in row ? row.key : row.label} className="contents">
          <dt className="text-sm font-medium text-muted-foreground">{row.label}</dt>
          <dd className="text-sm text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TaxonomySection({ heading, chips }: { heading: string; chips: JobDetailChipVM[] }) {
  if (chips.length === 0) return null;

  return (
    <section aria-label={heading} className="space-y-2">
      <h3 className="text-sm font-semibold">{heading}</h3>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <a key={chip.key} href={chip.href} className={badgeVariants({ variant: "outline" })}>
            {chip.name}
          </a>
        ))}
      </div>
    </section>
  );
}

export function JobSearchResultDetail({
  vm,
  fullPageHref,
  fullPageLabel,
  applySlot,
  saveSlot,
}: {
  vm: JobDetailVM;
  fullPageHref: string;
  fullPageLabel: string;
  applySlot?: React.ReactNode;
  saveSlot?: React.ReactNode;
}) {
  return (
    <article>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 p-4 backdrop-blur">
        <div
          data-slot="job-detail-primary-actions"
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          {applySlot ? <div className="min-w-0 flex-1">{applySlot}</div> : null}
          {saveSlot}
        </div>
        <a href={fullPageHref} className={cn(buttonVariants({ variant: "outline" }), "ml-auto")}>
          {fullPageLabel}
        </a>
      </div>

      <div className="space-y-8 p-5 md:p-6">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="rounded-xl">
              {vm.companyLogoUrl ? (
                <AvatarImage
                  src={vm.companyLogoUrl}
                  alt={vm.companyName ?? vm.title}
                  className="rounded-xl"
                />
              ) : null}
              <AvatarFallback className="rounded-xl">
                {initialsOf(vm.companyAvatarName)}
              </AvatarFallback>
            </Avatar>
            {vm.companyName ? (
              <p className="font-medium text-foreground">{vm.companyName}</p>
            ) : null}
          </div>

          <Text as="h2" variant="heading2">
            {vm.title}
          </Text>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{vm.locationLabel}</Badge>
            {vm.employmentTypeLabel ? (
              <Badge variant="secondary">{vm.employmentTypeLabel}</Badge>
            ) : null}
            {vm.seniorityLabel ? <Badge variant="secondary">{vm.seniorityLabel}</Badge> : null}
          </div>

          {vm.salaryLabel ? (
            <p className="text-lg font-semibold text-foreground">{vm.salaryLabel}</p>
          ) : null}
          {vm.publishedLabel ? (
            <p className="text-sm text-muted-foreground">{vm.publishedLabel}</p>
          ) : null}
        </header>

        {vm.descriptionHtml ? (
          <Prose html={vm.descriptionHtml} />
        ) : (
          <p className="text-muted-foreground">{vm.noDescriptionText}</p>
        )}

        <DefinitionList rows={vm.facts} />

        <TaxonomySection heading={vm.categoriesHeading} chips={vm.categoryChips} />
        <TaxonomySection heading={vm.skillsHeading} chips={vm.skillChips} />

        {vm.customFields.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{vm.additionalDetailsHeading}</h3>
            <DefinitionList rows={vm.customFields} />
          </section>
        ) : null}
      </div>
    </article>
  );
}
