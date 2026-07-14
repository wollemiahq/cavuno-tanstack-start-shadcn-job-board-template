import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { companySalaryPath } from '@cavuno/board/paths';
import { createBreadcrumbJsonLd, formatRange } from '@cavuno/board/seo';
import {
  createFileRoute,
  getRouteApi,
  interpolatePath,
  Link,
  notFound,
} from '@tanstack/react-router';
import { Building2 } from 'lucide-react';

import { m } from '../paraglide/messages';
import {
  getCompany,
  getCompanySalarySummary,
  getSeoBase,
  getSimilarCompanies,
  listCompanyJobs,
} from '../server/queries';

import { toJobCardVM } from '@/board/job-view-model';
import {
  toOverallSalaryVM,
  toSalaryRailVM,
  type RailItem,
} from '@/board/salary-view-model';
import { CompanyCard } from '@/components/board/company-card';
import { CompanySectionShell } from '@/components/board/company-section-header';
import { JobCard } from '@/components/board/job-card';
import { PageBody } from '@/components/board/page-body';
import { CompanySalarySummary } from '@/components/board/salary-sections';
import { JsonLd } from '@/components/json-ld';
import { Prose } from '@/components/prose';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const Route = createFileRoute('/companies/$companySlug/')({
  // Full-bleed so the shared PageBody owns the container + the breadcrumb
  // placement (the trail hugs the nav at pt-4/5, same as every other page).
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    try {
      const [company, jobs, similar, seo, salarySummary] = await Promise.all([
        getCompany({ data: { companySlug: params.companySlug } }),
        listCompanyJobs({ data: { companySlug: params.companySlug } }),
        getSimilarCompanies({
          data: { companySlug: params.companySlug, limit: 6 },
        }),
        getSeoBase(),
        getCompanySalarySummary({ data: { companySlug: params.companySlug } }),
      ]);
      // The salary summary IS the tab gate: the Salaries tab shows when there
      // is real salary data (an overall aggregate or per-category rows), the
      // same condition the salary route renders its empty state against.
      const hasSalaries =
        salarySummary.overallSalary !== null ||
        salarySummary.byCategory.length > 0;
      return {
        company,
        jobs,
        similar: similar.data,
        seo,
        salarySummary,
        hasSalaries,
      };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: loaderData.company.name },
            ...(loaderData.company.description
              ? [
                  {
                    name: 'description',
                    content: loaderData.company.description
                      .replace(/<[^>]+>/g, ' ')
                      .trim()
                      .slice(0, 160),
                  },
                ]
              : []),
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/companies/${loaderData.company.slug}`,
            },
          ],
        }
      : {},
  component: CompanyPage,
  notFoundComponent: () => (
    <PageBody>
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>{m.companyDetail_notFoundText()}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </PageBody>
  ),
});

const rootApi = getRouteApi('__root__');

/** Pre-resolve the pluralized "N open job(s)" label (shared across company cards). */
function jobCountLabel(count: number) {
  return count === 1
    ? m.companyDetail_openJobsCountOne({ count })
    : m.companyDetail_openJobsCountMany({ count });
}

/** Pluralized "View all N job(s)" CTA into the company jobs subpage. */
function viewAllJobsLabel(count: number) {
  return count === 1
    ? m.companyDetail_viewAllJobsCountOne({ count })
    : m.companyDetail_viewAllJobsCountMany({ count });
}

/** How many jobs the profile previews before deferring to the /jobs subpage. */
const JOBS_PREVIEW_COUNT = 6;

function CompanyPage() {
  const { company, jobs, similar, seo, salarySummary, hasSalaries } =
    Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;

  // Salary summary VMs (CAV-516) — condense the Salaries tab: the overall
  // range + the top few category rows, built through the SAME mappers the
  // Salaries tab uses so the figures stay consistent.
  const salaryOverallVM = salarySummary.overallSalary
    ? toOverallSalaryVM(
        {
          avgMin: salarySummary.overallSalary.avgMin,
          avgMax: salarySummary.overallSalary.avgMax,
          jobCount: salarySummary.overallSalary.jobCount,
        },
        board.language,
        seo.labels,
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
      range: formatRange(
        seo.language,
        category.avgSalaryMin,
        category.avgSalaryMax,
      ),
      jobCount: category.jobCount,
    }),
  );
  const salaryCategoriesVM = toSalaryRailVM(
    undefined,
    salaryCategoryItems,
    seo.language,
    seo.labels,
  );

  const canonical = `${seo.origin}/companies/${company.slug}`;
  const website = company.website
    ? /^https?:\/\//i.test(company.website)
      ? company.website
      : `https://${company.website}`
    : null;
  // ProfilePage + Organization + BreadcrumbList — starter-rendered per ADR-0039
  // from the API's company fields (mirrors the hosted company page's JSON-LD).
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url: canonical,
      mainEntity: {
        '@type': 'Organization',
        '@id': `${canonical}#organization`,
        name: company.name,
        identifier: company.id,
        ...(company.description
          ? {
              description: company.description.replace(/<[^>]+>/g, ' ').trim(),
            }
          : {}),
        url: website ?? canonical,
        ...(company.logoUrl ? { logo: company.logoUrl } : {}),
        ...(website ? { sameAs: [website] } : {}),
      },
    },
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.companies, href: `${seo.origin}/companies` },
      { label: company.name },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const previewJobs = jobs.data.slice(0, JOBS_PREVIEW_COUNT);

  return (
    <CompanySectionShell
      breadcrumb={{
        ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
        items: [
          { name: crumbs.home, href: '/' },
          { name: crumbs.companies, href: '/companies' },
          { name: company.name },
        ],
      }}
      company={company}
      activeSection="overview"
      jobCount={company.publishedJobCount}
      hasSalaries={hasSalaries}
    >
      <JsonLd data={jsonLd} />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Key-facts rail — right column on desktop, sticky as the profile
            scrolls; the primary CTA jumps to the full company jobs subpage. */}
        <aside className="lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:self-start">
          <Card>
            <CardContent className="flex flex-col gap-4">
              {website ? (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-sm font-medium">
                    {m.footer_websiteLabel()}
                  </span>
                  <Button
                    render={
                      <a href={website} target="_blank" rel="noreferrer" />
                    }
                    variant="link"
                    size="sm"
                    className="w-fit px-0"
                  >
                    {company.website}
                  </Button>
                </div>
              ) : null}

              {company.markets.length > 0 ? (
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
              ) : null}

              <p className="text-muted-foreground text-sm">
                {jobCountLabel(company.publishedJobCount)}
              </p>

              {company.publishedJobCount > 0 ? (
                <Button
                  render={
                    <Link
                      to="/companies/$companySlug/jobs"
                      params={{ companySlug: company.slug }}
                    />
                  }
                  className="w-full"
                >
                  {viewAllJobsLabel(company.publishedJobCount)}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </aside>

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
                {m.companyDetail_openJobsHeading()}
                {company.publishedJobCount > 0 ? (
                  <span className="text-muted-foreground ml-2">
                    {company.publishedJobCount}
                  </span>
                ) : null}
              </Text>
              {company.publishedJobCount > previewJobs.length ? (
                <Link
                  to="/companies/$companySlug/jobs"
                  params={{ companySlug: company.slug }}
                  className="text-foreground hover:text-foreground/80 focus-visible:ring-ring rounded-sm text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {viewAllJobsLabel(company.publishedJobCount)}
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
                    vm={toJobCardVM(job, board.language, board.labels)}
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
      </div>

      {similar.length > 0 ? (
        <section
          aria-label={m.companyDetail_similarCompaniesHeading()}
          className="border-border flex flex-col gap-4 border-t pt-8"
        >
          <Text as="h2" variant="heading4">
            {m.companyDetail_similarCompaniesHeading()}
          </Text>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((c) => (
              <CompanyCard
                key={c.id}
                companySlug={c.slug}
                name={c.name}
                logoUrl={c.logoUrl}
                description={c.description}
                publishedJobCount={c.publishedJobCount}
                jobCountLabel={jobCountLabel(c.publishedJobCount)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </CompanySectionShell>
  );
}
