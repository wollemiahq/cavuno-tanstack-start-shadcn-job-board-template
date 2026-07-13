import { Text } from '@/components/text'
import { createFileRoute } from '@tanstack/react-router'
import { boardCopy } from '#/copy'

import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo'

import { JsonLd } from '@/components/json-ld'
import { PageBody } from '@/components/board/page-body'
import {
  SalaryRail,
  type RailItem,
} from '@/components/board/salary-sections'
import { toSalaryBreadcrumbVM, toSalaryRailVM } from '@/board/salary-view-model'
import { m } from '../paraglide/messages'
import { getSeoBase, listSalaryCompanies } from '../server/queries'

export const Route = createFileRoute('/salaries/companies/')({
  staticData: { fullBleed: true },
  loader: async () => {
    const [companies, seo] = await Promise.all([
      listSalaryCompanies(),
      getSeoBase(),
    ])
    return { companies: companies.data, seo }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.salaryHub_companiesMetaTitle({
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: m.salaryHub_companiesMetaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/companies`,
            },
          ],
        }
      : {},
  component: SalaryCompaniesIndex,
})

function SalaryCompaniesIndex() {
  const { companies, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const locale = seo.language

  const jsonLd = [
    itemListJsonLd(
      companies.map((c) => ({
        name: c.companyName,
        url: `${seo.origin}/companies/${c.companySlug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.companies },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  const items: RailItem[] = companies.map((c) => ({
    name: c.companyName,
    href: `/companies/${c.companySlug}`,
    range: formatRange(locale, c.avgSalaryMin, c.avgSalaryMax),
    jobCount: c.jobCount,
    logoPath: c.logoPath,
  }))

  return (
    <PageBody
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: crumbs.companies },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">{m.salaryHub_companiesHeading()}</Text>
      </header>
      <SalaryRail vm={toSalaryRailVM('', items, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
