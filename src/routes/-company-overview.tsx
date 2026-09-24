/**
 * The company profile's Overview tab body, below the shared company shell
 * header: description, the operator's long-form fields, media, list, tile
 * and chip collections, then the jobs preview and salary
 * summary in the main column; key facts (website, markets, short custom
 * fields), documents, advertising and similar companies in the rail.
 *
 * The route owns the loader and head; this view renders from loader data so
 * it can be exercised without a server.
 */
import { companySalaryPath } from '@cavuno/board/paths';
import { interpolatePath, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import type { getCompanyProfilePage } from '../server/companies-pages';
import type { getSimilarCompanies } from '../server/queries';
import {
  companyDetailFields,
  type DetailCollection,
} from '@/board/detail-fields';
import type { JobFormSource } from '@/board/job-form';
import { toJobCardVM } from '@/board/job-view-model';
import {
  formatSalaryRange,
  toOverallSalaryVM,
  toSalaryRailVM,
  type RailItem,
} from '@/board/salary-view-model';
import { BoardAdSlot } from '@/components/board/board-ad-slot';
import { CompanyCard } from '@/components/board/company-card';
import { CompanySectionShell } from '@/components/board/company-section-header';
import {
  CollectionChips,
  DetailDocumentList,
  DetailMediaSections,
  DetailListCollections,
  DetailProseSections,
  DetailTileCollections,
  DetailValueView,
} from '@/components/board/detail-fields';
import { JobCard } from '@/components/board/job-card';
import { CompanySalarySummary } from '@/components/board/salary-sections';
import { DeferredContent } from '@/components/deferred-content';
import { Prose } from '@/components/prose';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { detailFieldsCopy } from '@/copy-groups/detail-fields';
import { textLinkClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';
import type { BoardProfileFormField } from '@cavuno/board';

type CompanyProfilePage = Awaited<ReturnType<typeof getCompanyProfilePage>>;
type SimilarCompany = Awaited<
  ReturnType<typeof getSimilarCompanies>
>['data'][number];

export interface CompanyOverviewProps {
  company: CompanyProfilePage['company'];
  jobs: CompanyProfilePage['jobs'];
  salarySummary: CompanyProfilePage['salarySummary'];
  hasSalaries: boolean;
  similar: Promise<SimilarCompany[]>;
  /** The board context, as far as job cards and the company form need it. */
  board: JobFormSource & {
    forms?: { company?: readonly BoardProfileFormField[] | null } | null;
  };
}

/** Pre-resolve the pluralized "N open job(s)" label (shared across company cards). */
function jobCountLabel(count: number) {
  const locale = getLocale();
  return m.companyDetail_openJobsCount({
    count,
    countLabel: count.toLocaleString(locale),
  });
}

/**
 * The jobs-preview heading: "N Open jobs", or the bare "Open jobs" when the
 * company has none. Deliberately its own key — the `openJobsCount*` pair is
 * shared with the company cards, search labels, and home rail.
 */
function openJobsHeading(count: number) {
  if (count === 0) return m.companyDetail_openJobsHeading();
  const locale = getLocale();
  return m.companyDetail_openJobsHeadingCount({
    count,
    countLabel: count.toLocaleString(locale),
  });
}

/** How many jobs the profile previews before deferring to the /jobs subpage. */
const JOBS_PREVIEW_COUNT = 6;

/**
 * A chip collection in the main column. Always here, however many entries
 * the company selected, so placement never depends on a count.
 */
function CollectionChipSection({
  collection,
}: {
  collection: DetailCollection;
}) {
  return (
    <section aria-label={collection.label} className="flex flex-col gap-3">
      <Text as="h2" variant="heading4">
        {collection.label}
      </Text>
      <CollectionChips collection={collection} />
    </section>
  );
}

export function CompanyOverview({
  company,
  jobs,
  salarySummary,
  hasSalaries,
  similar,
  board,
}: CompanyOverviewProps) {
  // Salary summary VMs condense the Salaries tab: the overall
  // range + the top few category rows, built through the SAME mappers the
  // Salaries tab uses so the figures stay consistent.
  const salaryOverallVM = salarySummary.overallSalary
    ? toOverallSalaryVM(
        {
          avgMin: salarySummary.overallSalary.avgMin,
          avgMax: salarySummary.overallSalary.avgMax,
          jobCount: salarySummary.overallSalary.jobCount,
        },
        getLocale(),
        salarySummary.currency,
      )
    : null;
  const salaryCategoryItems: RailItem[] = salarySummary.byCategory.map(
    (category) => ({
      name: category.categoryName,
      href: interpolatePath({
        path: '/companies/$companySlug/salaries/$categorySlug',
        params: {
          companySlug: company.slug,
          categorySlug: category.categorySlug,
        },
      }).interpolatedPath,
      range:
        formatSalaryRange(
          getLocale(),
          category.avgSalaryMin,
          category.avgSalaryMax,
          salarySummary.currency,
        ) ?? '',
      jobCount: category.jobCount,
    }),
  );
  const salaryCategoriesVM = toSalaryRailVM(
    undefined,
    salaryCategoryItems,
    getLocale(),
  );

  const website = company.website
    ? /^https?:\/\//i.test(company.website)
      ? company.website
      : `https://${company.website}`
    : null;

  const previewJobs = jobs.data.slice(0, JOBS_PREVIEW_COUNT);

  // The operator's custom fields and collections, placed by size class in
  // the company form's order.
  const detailCopy = detailFieldsCopy(getLocale());
  const detailFields = companyDetailFields(
    company,
    // An API that predates form layouts omits `forms`.
    board.forms?.company,
    detailCopy.format,
  );

  return (
    <CompanySectionShell
      company={company}
      activeSection="overview"
      jobCount={company.publishedJobCount}
      hasSalaries={hasSalaries}
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Main column — description prose and the jobs preview; both columns
            share row 1 so the rail sticks alongside. The company header + tabs
            are the shared shell above. */}
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          {company.description ? (
            // Company descriptions arrive pre-sanitized from the Board API.
            <Prose html={company.description} />
          ) : null}

          <DetailProseSections fields={detailFields.prose} />
          <DetailMediaSections media={detailFields.media} />
          <DetailListCollections collections={detailFields.listCollections} />
          <DetailTileCollections collections={detailFields.tileCollections} />
          {detailFields.chipCollections.map((collection) => (
            <CollectionChipSection
              key={collection.key}
              collection={collection}
            />
          ))}

          <section
            aria-label={m.companyDetail_openJobsHeading()}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text as="h2" variant="heading4">
                {openJobsHeading(company.publishedJobCount)}
              </Text>
              {company.publishedJobCount > previewJobs.length ? (
                <Link
                  to="/companies/$companySlug/jobs"
                  params={{ companySlug: company.slug }}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'no-underline',
                  )}
                >
                  {m.companyDetail_viewOpenJobsLabel()}
                  <ArrowRight
                    className="rtl:rotate-180"
                    data-icon="inline-end"
                  />
                </Link>
              ) : null}
            </div>
            {previewJobs.length === 0 ? (
              <Empty className="min-h-40 border">
                <EmptyHeader>
                  <EmptyTitle>{m.companyDetail_noOpenJobsText()}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {previewJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    vm={toJobCardVM(job, getLocale(), board)}
                    compact
                  />
                ))}
              </div>
            )}
          </section>

          {/* Salary summary — parallel to the jobs preview, so the Overview
              reads as a page of section summaries. Gated on real salary data
              (same gate as the Salaries tab); defers to the full tab. */}
          {hasSalaries ? (
            <CompanySalarySummary
              title={m.companyDetail_salariesSummaryHeading()}
              overall={salaryOverallVM}
              categories={salaryCategoriesVM}
              viewAllHref={companySalaryPath(company.slug)}
              viewAllLabel={m.companyDetail_viewSalariesLink()}
            />
          ) : null}
        </div>

        {/* Key-facts sidebar — right column on desktop, scrolling with the
            profile. Last in the DOM so it stacks BELOW the content on narrow
            screens (reading and tab order follow the visual order); the
            explicit lg column placement lifts it back alongside. */}
        <aside className="flex flex-col gap-8 lg:col-start-2 lg:row-start-1 lg:self-start">
          <Card>
            <CardContent className="flex flex-col gap-4">
              {website ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-sm font-medium">
                    {m.companyDetail_websiteLabel()}
                  </span>
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(textLinkClass, 'w-fit max-w-full truncate')}
                  >
                    {company.website}
                  </a>
                </div>
              ) : null}

              {company.markets.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-sm font-medium">
                    {m.employerProfile_marketsLabel()}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {company.markets.map((market) => (
                      <Link
                        key={market.slug}
                        to="/companies/markets/$market"
                        params={{ market: market.slug }}
                        className="focus-visible:ring-ring rounded-full transition-opacity hover:no-underline hover:opacity-75 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <Badge variant="secondary">{market.name}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {detailFields.facts.length > 0 ? (
                <dl className="flex flex-col gap-4">
                  {detailFields.facts.map((fact) => (
                    <div key={fact.key} className="flex flex-col gap-1.5">
                      <dt className="text-muted-foreground text-sm font-medium">
                        {fact.label}
                      </dt>
                      <dd className="text-sm">
                        <DetailValueView value={fact.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </CardContent>
          </Card>

          {detailFields.documents.length > 0 ? (
            <Card>
              <CardContent>
                <DetailDocumentList
                  heading={detailCopy.documentsHeading}
                  documents={detailFields.documents}
                />
              </CardContent>
            </Card>
          ) : null}

          <BoardAdSlot
            placement="company:detail.sidebar"
            layout="rectangle"
            media="(min-width: 1024px)"
            className="mx-auto"
          />

          {/* Similar companies follow the key facts and advertising, the same
              way similar jobs sit under the apply card on job detail. Deferred
              (streamed via <Await>): the rail fills in when the search backend
              answers, and stays hidden while it resolves or if it degrades to
              empty. */}
          <DeferredContent promise={similar}>
            {(similarCompanies) =>
              similarCompanies.length > 0 ? (
                <section
                  aria-label={m.companyDetail_similarCompaniesHeading()}
                  className="flex flex-col gap-4"
                >
                  <Text as="h2" variant="heading4">
                    {m.companyDetail_similarCompaniesHeading()}
                  </Text>
                  <div className="flex flex-col gap-4">
                    {similarCompanies.map((c) => (
                      <CompanyCard
                        key={c.id}
                        companySlug={c.slug}
                        name={c.name}
                        logoUrl={c.logoUrl}
                        summary={c.summary}
                        publishedJobCount={c.publishedJobCount}
                        jobCountLabel={jobCountLabel(c.publishedJobCount)}
                        membershipPlanName={c.membership?.planName ?? null}
                      />
                    ))}
                  </div>
                </section>
              ) : null
            }
          </DeferredContent>
        </aside>
      </div>
    </CompanySectionShell>
  );
}
