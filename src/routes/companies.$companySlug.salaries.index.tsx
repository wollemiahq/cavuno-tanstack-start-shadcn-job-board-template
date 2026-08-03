import { isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  boardUrl,
  companyPath,
  companySalaryPath,
  salaryLocationPath,
} from '@cavuno/board/paths';
import {
  buildSalaryFaq,
  companySalaryJsonLd,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatRange,
} from '@cavuno/board/seo';
import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getCompany, getCompanySalary, getSeoBase } from '../server/queries';
import { SalaryNotFoundPage } from './-salary-page-layout';

import {
  companyCategorySalaryPath,
  salaryCompanyTitle,
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
import { JsonLd } from '@/components/json-ld';
import { Text } from '@/components/text';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/companies/$companySlug/salaries/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let salary;
    try {
      salary = await getCompanySalary({
        data: { companySlug: params.companySlug },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    // The full company powers the shared section header (logo + description),
    // byte-identical to the profile + jobs tabs. The company slug is never
    // localized → no canonical drift, no 308.
    const [company, seo] = await Promise.all([
      getCompany({ data: { companySlug: params.companySlug } }),
      getSeoBase(),
    ]);
    return { salary, company, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData.seo.boardName,
                salaryCompanyTitle(
                  loaderData.seo.language,
                  loaderData.salary.companyName,
                  loaderData.salary.overallSalary
                    ? formatRange(
                        loaderData.seo.language,
                        loaderData.salary.overallSalary.avgMin,
                        loaderData.salary.overallSalary.avgMax,
                      )
                    : null,
                ),
              ),
            },
            {
              name: 'description',
              content: loaderData.salary.overallSalary
                ? m.companySalaries_metaDescriptionWithData({
                    company: loaderData.salary.companyName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.companySalaries_metaDescriptionEmpty({
                    company: loaderData.salary.companyName,
                  }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                companySalaryPath(loaderData.salary.companySlug),
              ),
            },
          ],
        }
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
  const { salary, company, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language, seo.labels);
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;

  const faqs = buildSalaryFaq(locale, salary.companyName, salary.overallSalary);
  // Home → Companies → {Company} → Salaries. The company entity links to its
  // profile and the trailing Salaries crumb marks the section — matching the
  // hosted board and the visible shell breadcrumb for this path (the tab row
  // reinforces the same position). The BreadcrumbList JSON-LD mirrors it.
  const jsonLd = [
    companySalaryJsonLd(locale, salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      {
        label: crumbs.companies,
        href: boardUrl(seo.origin, BOARD_PATHS.companies),
      },
      {
        label: salary.companyName,
        href: boardUrl(seo.origin, companyPath(salary.companySlug)),
      },
      { label: crumbs.salaries },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const categoryItems: RailItem[] = salary.byCategory.map((x) => ({
    name: x.categoryName,
    href: companyCategorySalaryPath(salary.companySlug, x.categorySlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const competitorItems: RailItem[] = salary.competitors.map((x) => ({
    name: x.companyName,
    href: companySalaryPath(x.companySlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }));
  const locationItems: RailItem[] = salary.topLocations.map((x) => ({
    name: x.locationName,
    href: salaryLocationPath(x.placeSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
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
        <JsonLd data={jsonLd} />
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
              seo.labels,
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
                seo.labels,
              )}
            />
          </section>
        ) : null}

        <SalaryRail
          vm={toSalaryRailVM(
            m.companySalaries_salariesByRoleLabel(),
            categoryItems,
            seo.language,
            seo.labels,
          )}
        />
        <SalaryRail
          vm={toSalaryRailVM(
            m.companySalaries_topLocationsLabel(),
            locationItems,
            seo.language,
            seo.labels,
          )}
        />
        <SalaryRail
          vm={toSalaryRailVM(
            m.companySalaries_otherCompaniesLabel(),
            competitorItems,
            seo.language,
            seo.labels,
          )}
        />
        <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language, seo.labels)} />
      </div>
    </CompanySectionShell>
  );
}
