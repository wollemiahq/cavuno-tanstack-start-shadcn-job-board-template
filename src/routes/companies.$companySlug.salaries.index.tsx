import { Text } from '@/components/text'
import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router'

import { isNotFound } from '@cavuno/board'
import { boardCopy } from '#/copy'
import {
  buildSalaryFaq,
  companySalaryJsonLd,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatRange,
} from '@cavuno/board/seo'

import { JsonLd } from '@/components/json-ld'
import { CompanySectionShell } from '@/components/board/company-section-header'
import {
  SalaryEmptyState,
  OverallSalaryCard,
  SalaryFaq,
  SalaryRail,
  SenioritySalaryTable,
  type RailItem,
} from '@/components/board/salary-sections'
import {
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryFaqVM,
  toSalaryRailVM,
  toSeniorityTableVM,
} from '@/board/salary-view-model'
import { m } from '../paraglide/messages'
import { getCompany, getCompanySalary, getSeoBase } from '../server/queries'

export const Route = createFileRoute('/companies/$companySlug/salaries/')({
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    let salary
    try {
      salary = await getCompanySalary({
        data: { companySlug: params.companySlug },
      })
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
    // The full company powers the shared section header (logo + description),
    // byte-identical to the profile + jobs tabs. The company slug is never
    // localized → no canonical drift, no 308.
    const [company, seo] = await Promise.all([
      getCompany({ data: { companySlug: params.companySlug } }),
      getSeoBase(),
    ])
    return { salary, company, seo }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.companySalaries_metaTitle({
                company: loaderData.salary.companyName,
                boardName: loaderData.seo.boardName,
              }),
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
              href: `${loaderData.seo.origin}/companies/${loaderData.salary.companySlug}/salaries`,
            },
          ],
        }
      : {},
  component: CompanySalaryPage,
  notFoundComponent: () => (
    <SalaryEmptyState title={m.companySalaries_notFoundCompany()} />
  ),
})

const rootApi = getRouteApi('__root__')

function CompanySalaryPage() {
  const { salary, company, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const { board } = rootApi.useLoaderData()
  const locale = seo.language

  const faqs = buildSalaryFaq(locale, salary.companyName, salary.overallSalary)
  // The trail locates the ENTITY and stops there (Home → Companies →
  // {Company}) — IDENTICAL to the profile + jobs tabs; the tab row alone says
  // we are on Salaries. The BreadcrumbList JSON-LD mirrors the visible trail.
  const jsonLd = [
    companySalaryJsonLd(locale, salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.companies, href: `${seo.origin}/companies` },
      { label: salary.companyName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  const categoryItems: RailItem[] = salary.byCategory.map((x) => ({
    name: x.categoryName,
    href: `/companies/${salary.companySlug}/salaries/${x.categorySlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))
  const competitorItems: RailItem[] = salary.competitors.map((x) => ({
    name: x.companyName,
    href: `/companies/${x.companySlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }))
  const locationItems: RailItem[] = salary.topLocations.map((x) => ({
    name: x.locationName,
    href: `/salaries/locations/${x.placeSlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))

  return (
    <CompanySectionShell
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.companies, href: '/companies' },
          { name: salary.companyName },
        ],
        seo.language,
        seo.labels,
      )}
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
          <Text as="h2" variant="heading4">{m.companySalaries_seniorityHeading()}</Text>
          <SenioritySalaryTable vm={toSeniorityTableVM(salary.bySeniority, board.language, seo.labels)} />
        </section>
      ) : null}

      <SalaryRail vm={toSalaryRailVM(m.companySalaries_salariesByRoleLabel(), categoryItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.companySalaries_topLocationsLabel(), locationItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.companySalaries_otherCompaniesLabel(), competitorItems, seo.language, seo.labels)} />
      <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language, seo.labels)} />
      </div>
    </CompanySectionShell>
  )
}
