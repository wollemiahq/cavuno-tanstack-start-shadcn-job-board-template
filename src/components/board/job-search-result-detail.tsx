import type {
  JobDetailChipVM,
  JobDetailCustomFieldVM,
  JobDetailFactVM,
  JobDetailVM,
} from '@/board/job-detail-view-model';
import { Prose } from '@/components/prose';
import { Text } from '@/components/text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { initialsOf } from '@/lib/initials';

function DefinitionList({
  rows,
}: {
  rows: Array<JobDetailFactVM | JobDetailCustomFieldVM>;
}) {
  if (rows.length === 0) return null;

  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
      {rows.map((row) => (
        <div key={'key' in row ? row.key : row.label} className="contents">
          <dt className="text-muted-foreground text-sm font-medium">
            {row.label}
          </dt>
          <dd className="text-foreground text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TaxonomySection({
  heading,
  chips,
}: {
  heading: string;
  chips: JobDetailChipVM[];
}) {
  if (chips.length === 0) return null;

  return (
    <section aria-label={heading} className="space-y-2">
      <h3 className="text-sm font-semibold">{heading}</h3>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <Badge
            key={chip.key}
            variant="outline"
            render={<a href={chip.href} />}
          >
            {chip.name}
          </Badge>
        ))}
      </div>
    </section>
  );
}

export function JobSearchResultDetail({
  vm,
  applySlot,
  saveSlot,
  loading = false,
}: {
  vm: JobDetailVM;
  applySlot?: React.ReactNode;
  saveSlot?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <article>
      <div
        data-slot="job-detail-sticky-header"
        className="border-border bg-background/95 sticky top-0 z-10 flex min-h-16 items-center justify-end gap-3 border-b p-3 backdrop-blur"
      >
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">
            {vm.title}
          </p>
          {vm.companyName ? (
            <p className="text-muted-foreground truncate text-xs">
              {vm.companyName}
            </p>
          ) : null}
        </div>
        <div
          data-slot="job-detail-primary-actions"
          data-inert={loading ? 'true' : undefined}
          inert={loading ? true : undefined}
          className="ml-auto flex shrink-0 items-center gap-2 data-[inert=true]:pointer-events-none data-[inert=true]:opacity-50"
        >
          {applySlot}
          {saveSlot}
        </div>
      </div>

      {loading ? (
        <div
          data-slot="job-detail-loading-body"
          className="space-y-6 p-5 md:p-6"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-5 w-36" />
          </div>
          <Skeleton className="h-9 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : (
        <div className="space-y-8 p-5 md:p-6">
          <header className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="rounded-xl">
                {vm.companyLogoUrl ? (
                  <AvatarImage
                    src={vm.companyLogoUrl}
                    alt=""
                    className="rounded-xl"
                  />
                ) : null}
                <AvatarFallback className="rounded-xl">
                  {initialsOf(vm.companyAvatarName)}
                </AvatarFallback>
              </Avatar>
              {vm.companyName ? (
                <p className="text-foreground font-medium">{vm.companyName}</p>
              ) : null}
            </div>

            <Text as="h2" variant="heading2">
              {vm.detailHref ? (
                <a
                  href={vm.detailHref}
                  className="outline-none hover:underline focus-visible:underline"
                >
                  {vm.title}
                </a>
              ) : (
                vm.title
              )}
            </Text>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{vm.locationLabel}</Badge>
              {vm.employmentTypeLabel ? (
                <Badge variant="secondary">{vm.employmentTypeLabel}</Badge>
              ) : null}
              {vm.seniorityLabel ? (
                <Badge variant="secondary">{vm.seniorityLabel}</Badge>
              ) : null}
            </div>

            {vm.salaryLabel ? (
              <p className="text-foreground text-lg font-semibold">
                {vm.salaryLabel}
              </p>
            ) : null}
            {vm.publishedLabel ? (
              <p className="text-muted-foreground text-sm">
                {vm.publishedLabel}
              </p>
            ) : null}
          </header>

          {vm.descriptionHtml ? (
            <Prose html={vm.descriptionHtml} />
          ) : (
            <p className="text-muted-foreground">{vm.noDescriptionText}</p>
          )}

          <DefinitionList rows={vm.facts} />

          <TaxonomySection
            heading={vm.categoriesHeading}
            chips={vm.categoryChips}
          />
          <TaxonomySection heading={vm.skillsHeading} chips={vm.skillChips} />

          {vm.customFields.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                {vm.additionalDetailsHeading}
              </h3>
              <DefinitionList rows={vm.customFields} />
            </section>
          ) : null}
        </div>
      )}
    </article>
  );
}
