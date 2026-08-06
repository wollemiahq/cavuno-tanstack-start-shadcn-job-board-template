import { isNotFound } from '@cavuno/board';
import { companySalaryPath } from '@cavuno/board/paths';
import {
  createFileRoute,
  interpolatePath,
  Link,
  notFound,
} from '@tanstack/react-router';
import { ArrowRight, Building2 } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getCompanyProfilePage } from '../server/companies-pages';
import { getSimilarCompanies } from '../server/queries';

import { toJobCardVM } from '@/board/job-view-model';
import {
  formatSalaryRange,
  toOverallSalaryVM,
  toSalaryRailVM,
  type RailItem,
} from '@/board/salary-view-model';
import { CompanyCard } from '@/components/board/company-card';
import { CompanySectionShell } from '@/components/board/company-section-header';
import { JobCard } from '@/components/board/job-card';
import { CompanySalarySummary } from '@/components/board/salary-sections';
import { DeferredContent } from '@/components/deferred-content';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageLayout } from '@/components/layout/page-layout';
import { Prose } from '@/components/prose';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/companies/$companySlug/')({
  // The shared page layout owns the canonical route geometry.
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    try {
      // ONE server fn: company, jobs, salary gate and SEO base resolve in a
      // single parallel batch server-side (see getCompanyProfilePage). The
      // old shape awaited a three-read Promise.all and THEN an SEO call,
      // serializing a second wave just to build head tags.
      // Similar companies is a below-the-fold, search-backed rail. It needs
      // only the slug, so it is kicked off BEFORE the page batch is awaited —
      // starting it after made it a second serial wave, and SSR renders the
      // rail into the document, so "deferred" did not keep it off the
      // first-byte path. Now it overlaps the four page reads instead.
      // Degrades to empty, never fatal.
      const similar = getSimilarCompanies({
        data: { companySlug: params.companySlug, limit: 6 },
      })
        .then((r) => r.data)
        .catch(() => []);
      const pageData = await getCompanyProfilePage({
        data: { companySlug: params.companySlug },
      });
      return { ...pageData, similar };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CompanyPage,
  notFoundComponent: () => (
    <PageLayout>
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>{m.companyDetail_notFoundText()}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </PageLayout>
  ),
});

/** Pre-resolve the pluralized "N open job(s)" label (shared across company cards). */
function jobCountLabel(count: number) {
  const locale = getLocale();
  const formatted = count.toLocaleString(locale);
  return new Intl.PluralRules(locale).select(count) === 'one'
    ? m.companyDetail_openJobsCountOne({ count: formatted })
    : m.companyDetail_openJobsCountMany({ count: formatted });
}

/**
 * The jobs-preview heading: "N Open jobs", or the bare "Open jobs" when the
 * company has none. Deliberately its own key — the `openJobsCount*` pair is
 * shared with the company cards, search labels, and home rail.
 */
function openJobsHeading(count: number) {
  if (count === 0) return m.companyDetail_openJobsHeading();
  const locale = getLocale();
  const formatted = count.toLocaleString(locale);
  return new Intl.PluralRules(locale).select(count) === 'one'
    ? m.companyDetail_openJobsHeadingCountOne({ count: formatted })
    : m.companyDetail_openJobsHeadingCountMany({ count: formatted });
}

/** How many jobs the profile previews before deferring to the /jobs subpage. */
const JOBS_PREVIEW_COUNT = 6;

function CompanyPage() {
  const { company, jobs, similar, salarySummary, hasSalaries } =
    Route.useLoaderData();

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
                    vm={toJobCardVM(job, getLocale())}
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

        {/* Key-facts rail — right column on desktop, sticky as the profile
            scrolls. Last in the DOM so it stacks BELOW the content on narrow
            screens (reading and tab order follow the visual order); the
            explicit lg column placement lifts it back alongside. */}
        <aside className="flex flex-col gap-8 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:self-start">
          <Card>
            <CardContent className="flex flex-col gap-4">
              {website ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-sm font-medium">
                    {m.footer_websiteLabel()}
                  </span>
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({
                      variant: 'link',
                      size: 'sm',
                      className: 'w-fit max-w-full justify-start truncate px-0',
                    })}
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
            </CardContent>
          </Card>

          {/* Similar companies sit directly under the key-facts card, the same
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
                        summary={(c as { summary?: string | null }).summary ?? null}
                        publishedJobCount={c.publishedJobCount}
                        jobCountLabel={jobCountLabel(c.publishedJobCount)}
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
