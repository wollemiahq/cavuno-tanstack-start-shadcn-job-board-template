import { Link } from '@tanstack/react-router';

import type { CompanyDetailVM } from '@/board/company-view-model';
import type { JobCardVM } from '@/board/job-view-model';
import type { OverallSalaryVM } from '@/board/salary-view-model';
import { CompanyAvatar } from '@/components/board/company-avatar';
import { JobCard } from '@/components/board/job-card';
import { SearchDetailHeader } from '@/components/board/search-detail-header';
import { Prose } from '@/components/prose';
import { SearchResultDetailHeader } from '@/components/search-results/search-results';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { m } from '../../paraglide/messages';

function CompanyDetailActions({
  vm,
  hasJobs,
  hasSalaries,
  compact = false,
}: {
  vm: CompanyDetailVM;
  hasJobs: boolean;
  hasSalaries: boolean;
  compact?: boolean;
}) {
  if (!hasJobs && !hasSalaries) return null;

  return (
    <div
      data-slot="company-detail-primary-actions"
      className={
        compact
          ? 'flex shrink-0 items-center gap-2'
          : 'col-start-1 row-start-2 flex w-fit max-w-full min-w-0 items-center gap-2'
      }
    >
      {hasJobs ? (
        <Link
          to="/companies/$companySlug/jobs"
          params={{ companySlug: vm.companySlug }}
          className={buttonVariants({ size: compact ? 'sm' : 'default' })}
        >
          {vm.viewJobsLabel}
        </Link>
      ) : null}
      {hasSalaries ? (
        <Link
          to="/companies/$companySlug/salaries"
          params={{ companySlug: vm.companySlug }}
          className={buttonVariants({
            variant: 'outline',
            size: compact ? 'sm' : 'default',
          })}
        >
          {vm.viewSalariesLabel}
        </Link>
      ) : null}
    </div>
  );
}

function ExpandedCompanyDetailHeader({
  vm,
  hasJobs,
  hasSalaries,
  interactive,
}: {
  vm: CompanyDetailVM;
  hasJobs: boolean;
  hasSalaries: boolean;
  interactive: boolean;
}) {
  return (
    <div data-slot="company-detail-expanded-header">
      <header
        data-slot="company-detail-sticky-header"
        className="grid max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 p-5 md:p-6"
      >
        <div
          data-slot="company-detail-heading"
          className="col-start-1 row-start-1 flex min-w-0 items-center gap-3"
        >
          <CompanyAvatar name={vm.avatarName} logoUrl={vm.logoUrl} size="lg" />
          <div className="min-w-0 space-y-1">
            <Text as="h2" variant="heading2" className="truncate">
              {interactive ? (
                <a
                  href={vm.detailHref}
                  className="outline-none hover:underline focus-visible:underline"
                >
                  {vm.name}
                </a>
              ) : (
                vm.name
              )}
            </Text>
            {vm.openJobsLabel ? (
              <Badge variant="secondary">{vm.openJobsLabel}</Badge>
            ) : null}
          </div>
        </div>

        {interactive ? (
          <CompanyDetailActions
            vm={vm}
            hasJobs={hasJobs}
            hasSalaries={hasSalaries}
          />
        ) : null}
      </header>
    </div>
  );
}

function CompactCompanyDetailHeader({
  vm,
  hasJobs,
  hasSalaries,
  interactive,
}: {
  vm: CompanyDetailVM;
  hasJobs: boolean;
  hasSalaries: boolean;
  interactive: boolean;
}) {
  return (
    <SearchDetailHeader
      mark={
        <CompanyAvatar name={vm.avatarName} logoUrl={vm.logoUrl} size="lg" />
      }
      name={vm.name}
      nameHref={interactive ? vm.detailHref : null}
      subtitle={interactive ? vm.openJobsLabel : null}
      actions={
        interactive ? (
          <CompanyDetailActions
            vm={vm}
            hasJobs={hasJobs}
            hasSalaries={hasSalaries}
            compact
          />
        ) : null
      }
    />
  );
}

export function CompanySearchResultDetail({
  vm,
  jobPreviews = [],
  salaryOverall = null,
  hasSalaries = false,
  interactive = true,
}: {
  vm: CompanyDetailVM;
  jobPreviews?: JobCardVM[];
  salaryOverall?: OverallSalaryVM | null;
  hasSalaries?: boolean;
  interactive?: boolean;
}) {
  const hasJobs = jobPreviews.length > 0;
  const hasSalaryData = hasSalaries && salaryOverall !== null;
  const salarySample = salaryOverall?.stats.at(-1);

  return (
    <article className="max-w-full min-w-0">
      <SearchResultDetailHeader
        expanded={
          <ExpandedCompanyDetailHeader
            vm={vm}
            hasJobs={hasJobs}
            hasSalaries={hasSalaryData}
            interactive={interactive}
          />
        }
        compact={
          <CompactCompanyDetailHeader
            vm={vm}
            hasJobs={hasJobs}
            hasSalaries={hasSalaryData}
            interactive={interactive}
          />
        }
      />

      <div className="space-y-8 p-5 md:p-6">
        {vm.descriptionHtml ? (
          <Prose html={vm.descriptionHtml} />
        ) : (
          <p className="text-muted-foreground">{vm.noDescriptionText}</p>
        )}

        {interactive && jobPreviews.length > 0 ? (
          <section
            aria-label={m.companyDetail_openJobsHeading()}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-foreground text-sm font-semibold">
                {m.companyDetail_openJobsHeading()}
              </h3>
              <Link
                to="/companies/$companySlug/jobs"
                params={{ companySlug: vm.companySlug }}
                className={buttonVariants({ variant: 'link', size: 'sm' })}
              >
                {m.home_viewAllJobsLabel()}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {jobPreviews.slice(0, 4).map((job) => (
                <JobCard key={job.id} vm={job} compact />
              ))}
            </div>
          </section>
        ) : null}

        {interactive && hasSalaryData && salaryOverall ? (
          <section
            aria-label={m.companyDetail_salariesSummaryHeading()}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-foreground text-sm font-semibold">
                {m.companyDetail_salariesSummaryHeading()}
              </h3>
              <Link
                to="/companies/$companySlug/salaries"
                params={{ companySlug: vm.companySlug }}
                className={buttonVariants({ variant: 'link', size: 'sm' })}
              >
                {vm.viewSalariesLabel}
              </Link>
            </div>
            <Card size="sm">
              <CardContent className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  {salaryOverall.headlineLabel}
                </p>
                <p className="text-card-foreground text-xl font-semibold tabular-nums">
                  {salaryOverall.headlineValue}
                  <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                    {salaryOverall.perYearSuffix}
                  </span>
                </p>
                {salarySample ? (
                  <p className="text-muted-foreground text-sm">
                    {salarySample.label} {salarySample.value}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {vm.marketChips.length > 0 ? (
          <section aria-label={vm.marketsHeading} className="space-y-2">
            <h3 className="text-foreground text-sm font-semibold">
              {vm.marketsHeading}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {vm.marketChips.map((market) =>
                interactive ? (
                  <Badge
                    key={market.key}
                    variant="outline"
                    render={<a href={market.href} />}
                  >
                    {market.name}
                  </Badge>
                ) : (
                  <Badge key={market.key} variant="outline">
                    {market.name}
                  </Badge>
                ),
              )}
            </div>
          </section>
        ) : null}

        {vm.websiteHref && vm.websiteLabel ? (
          <dl
            data-slot="company-detail-facts"
            className="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2"
          >
            <dt className="text-muted-foreground text-sm font-medium">
              {vm.websiteHeading}
            </dt>
            <dd className="text-foreground min-w-0 text-sm [overflow-wrap:anywhere]">
              {interactive ? (
                <a
                  href={vm.websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                >
                  {vm.websiteLabel}
                </a>
              ) : (
                <span className="text-foreground text-sm">
                  {vm.websiteLabel}
                </span>
              )}
            </dd>
          </dl>
        ) : null}
      </div>
    </article>
  );
}
