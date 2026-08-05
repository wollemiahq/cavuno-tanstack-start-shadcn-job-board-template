import { isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  companyPath,
  companySalaryPath,
} from '@cavuno/board/paths';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getCompanyCategorySalaryPage } from '../server/companies-pages';
import { SalaryNotFoundPage, SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  companyCategorySalaryPath,
  formatSalaryRange,
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryFaqVM,
  toSalaryRailVM,
  toSeniorityTableVM,
} from '@/board/salary-view-model';
import {
  SalaryEmptyState,
  OverallSalaryCard,
  SalaryFaq,
  SalaryRail,
  SenioritySalaryTable,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageSection } from '@/components/layout/page';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

export const Route = createFileRoute(
  '/companies/$companySlug/salaries/$categorySlug',
)({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let page;
    try {
      page = await getCompanyCategorySalaryPage({
        data: {
          companySlug: params.companySlug,
          categorySlug: params.categorySlug,
        },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    // The API returns the board-language canonical category slug as data; the
    // starter owns the 308 redirect. The company slug is never localized.
    if (page.salary.categoryCanonicalSlug !== params.categorySlug) {
      throw redirect({
        to: '/companies/$companySlug/salaries/$categorySlug',
        params: {
          companySlug: params.companySlug,
          categorySlug: page.salary.categoryCanonicalSlug,
        },
        statusCode: 308,
      });
    }
    return page;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CompanyCategorySalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.companySalaries_notFoundCompanyCategory()} />
  ),
});

function CompanyCategorySalaryPage() {
  const { salary, faqs } = Route.useLoaderData();
  // UI breadcrumb trail — component-only copy family (rides the route chunk).
  const crumbs = breadcrumbsCopy();
  const locale = getLocale();

  const competitorItems: RailItem[] = salary.competitors.map((x) => ({
    name: x.companyName,
    href: companyCategorySalaryPath(
      x.companySlug,
      salary.categoryCanonicalSlug,
    ),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        salary.currency,
      ) ?? '',
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }));
  const hasSalaryContent = Boolean(
    salary.overallSalary ||
    salary.bySeniority.length ||
    competitorItems.length ||
    faqs.length,
  );
  const heading = m.companySalaries_categoryHeading({
    category: salary.categoryName,
    company: salary.companyName,
  });

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.companies, href: BOARD_PATHS.companies },
          {
            name: salary.companyName,
            href: companyPath(salary.companySlug),
          },
          {
            name: crumbs.salaries,
            href: companySalaryPath(salary.companySlug),
          },
          { name: salary.categoryName },
        ],
        getLocale(),
      )}
      title={heading}
    >
      {hasSalaryContent ? (
        <>
          {salary.overallSalary ? (
            <OverallSalaryCard
              vm={toOverallSalaryVM(
                {
                  avgMin: salary.overallSalary.avgMin,
                  avgMax: salary.overallSalary.avgMax,
                  jobCount: salary.overallSalary.jobCount,
                },
                getLocale(),
                salary.currency,
              )}
            />
          ) : null}

          {salary.bySeniority.length > 0 ? (
            <PageSection title={m.companySalaries_seniorityHeading()}>
              <SenioritySalaryTable
                vm={toSeniorityTableVM(
                  salary.bySeniority,
                  getLocale(),
                  salary.currency,
                )}
              />
            </PageSection>
          ) : null}

          <SalaryRail
            vm={toSalaryRailVM(
              m.companySalaries_otherCompaniesHiringLabel({
                category: salary.categoryName,
              }),
              competitorItems,
              getLocale(),
            )}
          />
          <SalaryFaq vm={toSalaryFaqVM(faqs, getLocale())} />
        </>
      ) : (
        <SalaryEmptyState
          title={heading}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
