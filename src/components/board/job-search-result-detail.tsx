import { m } from '../../paraglide/messages';

import type {
  JobDetailChipVM,
  JobDetailCustomFieldVM,
  JobDetailFactVM,
  JobDetailVM,
} from '@/board/job-detail-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { JobAboutCompanyCard } from '@/components/board/job-about-company-card';
import { RelativeTimestamp } from '@/components/board/relative-timestamp';
import { SearchDetailHeader } from '@/components/board/search-detail-header';
import { Prose } from '@/components/prose';
import { SearchResultDetailHeader } from '@/components/search-results/search-results';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { localizePath } from '@/lib/localized-path';

function DefinitionList({
  rows,
}: {
  rows: Array<JobDetailFactVM | JobDetailCustomFieldVM>;
}) {
  if (rows.length === 0) return null;

  return (
    <dl className="grid max-w-full min-w-0 gap-x-6 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)]">
      {rows.map((row) => (
        <div key={'key' in row ? row.key : row.label} className="contents">
          <dt className="text-muted-foreground text-sm font-medium">
            {row.label}
          </dt>
          <dd className="text-foreground min-w-0 text-sm [overflow-wrap:anywhere]">
            {row.value}
          </dd>
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
            render={<a href={localizePath(chip.href)} />}
          >
            {chip.name}
          </Badge>
        ))}
      </div>
    </section>
  );
}

function JobDetailActions({
  applySlot,
  saveSlot,
  loading,
  compact = false,
}: {
  applySlot?: React.ReactNode;
  saveSlot?: React.ReactNode;
  loading: boolean;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div
        data-slot={
          compact
            ? 'job-detail-compact-actions-loading'
            : 'job-detail-actions-loading'
        }
        className="flex w-fit max-w-full min-w-0 shrink-0 items-center gap-2"
      >
        <Skeleton
          data-slot="job-detail-apply-action-skeleton"
          className="h-9 w-20 shrink-0"
        />
        <Skeleton
          data-slot="job-detail-save-action-skeleton"
          className="h-9 w-20 shrink-0"
        />
      </div>
    );
  }

  if (!applySlot && !saveSlot) return null;

  return (
    <div
      data-slot={
        compact ? 'job-detail-compact-actions' : 'job-detail-primary-actions'
      }
      className="flex w-fit max-w-full min-w-0 shrink-0 items-center gap-2"
    >
      {applySlot ? (
        <div data-testid="job-detail-apply-action" className="shrink-0">
          {applySlot}
        </div>
      ) : null}
      {saveSlot ? (
        <div data-testid="job-detail-save-action" className="shrink-0">
          {saveSlot}
        </div>
      ) : null}
    </div>
  );
}

function JobDetailHeadingSkeleton() {
  return (
    <div
      data-slot="job-detail-header-loading"
      className="col-start-1 row-start-1 flex min-w-0 flex-col gap-4"
    >
      <div
        data-slot="job-detail-company-row"
        className="flex min-h-10 min-w-0 items-center gap-2"
      >
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div data-slot="job-detail-title-row" className="flex flex-col">
        <Skeleton className="h-7 w-3/4 max-w-full" />
      </div>
      <div
        data-slot="job-detail-location-row"
        className="flex min-h-5 items-center"
      >
        <Skeleton className="h-5 w-48 max-w-full" />
      </div>
      <div
        data-slot="job-detail-badges"
        className="flex min-h-5 flex-wrap gap-1.5"
      >
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}

function JobDetailBodySkeleton() {
  return (
    <div
      data-slot="job-detail-loading-body"
      className="max-w-full min-w-0 space-y-8 p-5 md:p-6"
    >
      <div data-slot="job-detail-body-prose-skeleton" className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

function ExpandedJobDetailHeader({
  vm,
  applySlot,
  saveSlot,
  loading,
}: {
  vm: JobDetailVM;
  applySlot?: React.ReactNode;
  saveSlot?: React.ReactNode;
  loading: boolean;
}) {
  return (
    <header
      data-slot="job-detail-expanded-header"
      className="grid max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 p-5 md:p-6"
    >
      {loading ? (
        <JobDetailHeadingSkeleton />
      ) : (
        <div
          data-slot="job-detail-heading"
          className="col-start-1 row-start-1 flex min-w-0 flex-col gap-4"
        >
          <div
            data-slot="job-detail-company-row"
            className="flex min-h-10 min-w-0 items-center gap-2"
          >
            <CompanyAvatar
              name={vm.companyAvatarName}
              logoUrl={vm.companyLogoUrl}
              size="lg"
            />
            {vm.companyName ? (
              <div className="flex min-w-0 items-center gap-1 truncate">
                {vm.company ? (
                  <a
                    href={localizePath(vm.company.href)}
                    className="text-foreground truncate font-medium outline-none hover:underline focus-visible:underline"
                  >
                    {vm.companyName}
                  </a>
                ) : (
                  <span className="text-foreground truncate font-medium">
                    {vm.companyName}
                  </span>
                )}
              </div>
            ) : null}
          </div>

          <div data-slot="job-detail-title-row" className="flex items-start">
            <Text as="h2" variant="heading2" className="min-w-0">
              {vm.detailHref ? (
                <a
                  href={localizePath(vm.detailHref)}
                  className="outline-none hover:underline focus-visible:underline"
                >
                  {vm.title}
                </a>
              ) : (
                vm.title
              )}
            </Text>
          </div>

          <p
            data-slot="job-detail-location-row"
            className="text-muted-foreground min-h-5 text-sm"
          >
            {vm.locationLabel ?? m.jobDetail_locationNotSpecifiedLabel()}
            {vm.publishedLabel ? (
              <RelativeTimestamp label={vm.publishedLabel} prefix=" · " />
            ) : null}
          </p>

          <div
            data-slot="job-detail-badges"
            className="flex min-h-5 flex-wrap gap-1.5"
          >
            {vm.salaryLabel ? (
              <Badge
                variant="outline"
                className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {vm.salaryLabel}
              </Badge>
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
        </div>
      )}

      <div className="col-start-1 row-start-2 w-full justify-self-stretch">
        <JobDetailActions
          applySlot={applySlot}
          saveSlot={saveSlot}
          loading={loading}
        />
      </div>
    </header>
  );
}

function ExpandedJobDetailSkeletonHeader() {
  return (
    <header
      data-slot="job-detail-expanded-header"
      className="grid max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 p-5 md:p-6"
    >
      <JobDetailHeadingSkeleton />
      <div className="col-start-1 row-start-2 w-full justify-self-stretch">
        <JobDetailActions loading />
      </div>
    </header>
  );
}

function CompactJobDetailHeader({
  vm,
  applySlot,
  saveSlot,
  loading,
}: {
  vm: JobDetailVM;
  applySlot?: React.ReactNode;
  saveSlot?: React.ReactNode;
  loading: boolean;
}) {
  if (loading) return <CompactJobDetailSkeletonHeader />;

  return (
    <SearchDetailHeader
      mark={
        <CompanyAvatar
          name={vm.companyAvatarName}
          logoUrl={vm.companyLogoUrl}
          size="lg"
        />
      }
      name={vm.title}
      nameHref={vm.detailHref}
      subtitle={vm.companyName}
      actions={
        <JobDetailActions
          applySlot={applySlot}
          saveSlot={saveSlot}
          loading={false}
          compact
        />
      }
    />
  );
}

function CompactJobDetailSkeletonHeader() {
  return (
    <SearchDetailHeader
      mark={<Skeleton className="size-10 rounded-full" />}
      name={<Skeleton className="h-5 w-48 max-w-full" />}
      subtitle={<Skeleton className="h-4 w-32 max-w-full" />}
      actions={<JobDetailActions loading compact />}
    />
  );
}

export function JobSearchResultDetailPending({
  loadingLabel,
}: {
  loadingLabel: string;
}) {
  return (
    <article
      aria-busy="true"
      className="min-h-(--detail-pane-min-h) max-w-full min-w-0"
    >
      <span className="sr-only" role="status">
        {loadingLabel}
      </span>
      <SearchResultDetailHeader
        expanded={<ExpandedJobDetailSkeletonHeader />}
        compact={<CompactJobDetailSkeletonHeader />}
      />
      <JobDetailBodySkeleton />
    </article>
  );
}

export function JobSearchResultDetail({
  vm,
  applySlot,
  saveSlot,
  loading = false,
  loadingLabel = m.ui_loadingLabel(),
}: {
  vm: JobDetailVM;
  applySlot?: React.ReactNode;
  saveSlot?: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <article aria-busy={loading} className="max-w-full min-w-0">
      {loading ? (
        <span className="sr-only" role="status">
          {loadingLabel}
        </span>
      ) : null}
      <SearchResultDetailHeader
        expanded={
          <ExpandedJobDetailHeader
            vm={vm}
            applySlot={applySlot}
            saveSlot={saveSlot}
            loading={loading}
          />
        }
        compact={
          <CompactJobDetailHeader
            vm={vm}
            applySlot={applySlot}
            saveSlot={saveSlot}
            loading={loading}
          />
        }
      />

      {loading ? (
        <JobDetailBodySkeleton />
      ) : (
        <div className="max-w-full min-w-0 space-y-8 p-5 md:p-6">
          {vm.descriptionHtml ? (
            <Prose
              html={vm.descriptionHtml}
              className="max-w-full min-w-0 [overflow-wrap:anywhere]"
            />
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

          {vm.company ? <JobAboutCompanyCard company={vm.company} /> : null}
        </div>
      )}
    </article>
  );
}
