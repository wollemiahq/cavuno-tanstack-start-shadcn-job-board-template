import { isNotFound } from '@cavuno/board';
import { companySalaryPath, salaryLocationPath } from '@cavuno/board/paths';
import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getCompanySalariesPage } from '../server/companies-pages';
import { SalaryNotFoundPage } from './-salary-page-layout';

import {
  companyCategorySalaryPath,
  formatSalaryRange,
  toOverallSalaryVM,
  toSalaryFaqVM,
  toSalaryRailVM,
  toSeniorityTableVM,
} from '@/board/salary-view-model';
import { CompanySectionShell } from '@/components/board/company-section-header';
import {
  OverallSalaryCard,
  SalaryFaq,
  SalaryRail,
  SenioritySalaryTable,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { Text } from '@/components/text';

export const Route = createFileRoute('/companies/$companySlug/salaries/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    try {
      return await getCompanySalariesPage({
        data: { companySlug: params.companySlug },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CompanySalaryPage,
  // A company with no salary data 404s at the API (same as an unknown
  // company — parity with the hosted board, which returns null → notFound
  // for both). The empty body must still carry the page chrome: an h1 via
  // PageHeader, matching every sibling salary route (the standalone
  // SalaryEmptyState rendered no h1).
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.companySalaries_notFoundCompany()} />
  ),
});

const rootApi = getRouteApi('__root__');

function CompanySalaryPage() {
  const { salary, company, seo, faqs } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;

  const categoryItems: RailItem[] = salary.byCategory.map((x) => ({
    name: x.categoryName,
    href: companyCategorySalaryPath(salary.companySlug, x.categorySlug),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        salary.currency,
      ) ?? '',
    jobCount: x.jobCount,
  }));
  const competitorItems: RailItem[] = salary.competitors.map((x) => ({
    name: x.companyName,
    href: companySalaryPath(x.companySlug),
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
  const locationItems: RailItem[] = salary.topLocations.map((x) => ({
    name: x.locationName,
    href: salaryLocationPath(x.placeSlug),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        salary.currency,
      ) ?? '',
    jobCount: x.jobCount,
  }));

  return (
    <CompanySectionShell
      company={company}
      activeSection="salaries"
      jobCount={company.publishedJobCount}
      hasSalaries={
        salary.overallSalary !== null || salary.byCategory.length > 0
      }
    >
      <div className="space-y-6">
        <header>
          <Text as="h2" variant="heading1">
            {m.companySalaries_heading({ company: salary.companyName })}
          </Text>
        </header>

        {salary.overallSalary ? (
          <OverallSalaryCard
            vm={toOverallSalaryVM(
              {
                avgMin: salary.overallSalary.avgMin,
                avgMax: salary.overallSalary.avgMax,
                jobCount: salary.overallSalary.jobCount,
              },
              board.language,
              salary.currency,
            )}
          />
        ) : null}

        {salary.bySeniority.length > 0 ? (
          <section className="space-y-3">
            <Text as="h2" variant="heading4">
              {m.companySalaries_seniorityHeading()}
            </Text>
            <SenioritySalaryTable
              vm={toSeniorityTableVM(
                salary.bySeniority,
                board.language,
                salary.currency,
              )}
            />
          </section>
        ) : null}

        <SalaryRail
          vm={toSalaryRailVM(
            m.companySalaries_salariesByRoleLabel(),
            categoryItems,
            seo.language,
          )}
        />
        <SalaryRail
          vm={toSalaryRailVM(
            m.companySalaries_topLocationsLabel(),
            locationItems,
            seo.language,
          )}
        />
        <SalaryRail
          vm={toSalaryRailVM(
            m.companySalaries_otherCompaniesLabel(),
            competitorItems,
            seo.language,
          )}
        />
        <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language)} />
      </div>
    </CompanySectionShell>
  );
}
