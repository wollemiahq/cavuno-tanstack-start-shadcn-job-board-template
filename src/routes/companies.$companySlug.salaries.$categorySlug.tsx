import { boardCopy } from '#/copy';
import { isNotFound } from '@cavuno/board';
import {
  buildSalaryFaq,
  companyCategorySalaryJsonLd,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatRange,
} from '@cavuno/board/seo';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getCompanyCategorySalary, getSeoBase } from '../server/queries';
import {
  SalaryNotFoundPage,
  SalaryPageLayout,
  SalaryPendingPage,
} from './-salary-page-layout';

import {
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
import { JsonLd } from '@/components/json-ld';
import { PageSection } from '@/components/layout/page';

export const Route = createFileRoute(
  '/companies/$companySlug/salaries/$categorySlug',
)({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let salary;
    try {
      salary = await getCompanyCategorySalary({
        data: {
          companySlug: params.companySlug,
          categorySlug: params.categorySlug,
        },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    // The API returns the board-language canonical category slug and never 308s;
    // the starter performs the redirect (S3). The company slug is never localized.
    if (salary.categoryCanonicalSlug !== params.categorySlug) {
      throw redirect({
        to: '/companies/$companySlug/salaries/$categorySlug',
        params: {
          companySlug: params.companySlug,
          categorySlug: salary.categoryCanonicalSlug,
        },
        statusCode: 308,
      });
    }
    const seo = await getSeoBase();
    return { salary, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.companySalaries_categoryMetaTitle({
                company: loaderData.salary.companyName,
                category: loaderData.salary.categoryName,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: loaderData.salary.overallSalary
                ? m.companySalaries_categoryMetaDescriptionWithData({
                    category: loaderData.salary.categoryName,
                    company: loaderData.salary.companyName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.companySalaries_categoryMetaDescriptionEmpty({
                    category: loaderData.salary.categoryName,
                    company: loaderData.salary.companyName,
                  }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/companies/${loaderData.salary.companySlug}/salaries/${loaderData.salary.categoryCanonicalSlug}`,
            },
          ],
        }
      : {},
  component: CompanyCategorySalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.companySalaries_notFoundCompanyCategory()} />
  ),
});

const rootApi = getRouteApi('__root__');

function CompanyCategorySalaryPage() {
  const { salary, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;
  const label = m.companySalaries_categoryAtCompanyLabel({
    category: salary.categoryName,
    company: salary.companyName,
  });

  const faqs = buildSalaryFaq(locale, label, salary.overallSalary);
  const jsonLd = [
    companyCategorySalaryJsonLd(locale, salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.companies, href: `${seo.origin}/companies` },
      {
        label: salary.companyName,
        href: `${seo.origin}/companies/${salary.companySlug}`,
      },
      {
        label: crumbs.salaries,
        href: `${seo.origin}/companies/${salary.companySlug}/salaries`,
      },
      { label: salary.categoryName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const competitorItems: RailItem[] = salary.competitors.map((x) => ({
    name: x.companyName,
    href: `/companies/${x.companySlug}/salaries/${salary.categoryCanonicalSlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
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
          { name: crumbs.home, href: '/' },
          { name: crumbs.companies, href: '/companies' },
          {
            name: salary.companyName,
            href: `/companies/${salary.companySlug}`,
          },
          {
            name: crumbs.salaries,
            href: `/companies/${salary.companySlug}/salaries`,
          },
          { name: salary.categoryName },
        ],
        seo.language,
        seo.labels,
      )}
      title={heading}
    >
      <JsonLd data={jsonLd} />
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
                board.language,
                seo.labels,
              )}
            />
          ) : null}

          {salary.bySeniority.length > 0 ? (
            <PageSection title={m.companySalaries_seniorityHeading()}>
              <SenioritySalaryTable
                vm={toSeniorityTableVM(
                  salary.bySeniority,
                  board.language,
                  seo.labels,
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
              seo.language,
              seo.labels,
            )}
          />
          <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language, seo.labels)} />
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
