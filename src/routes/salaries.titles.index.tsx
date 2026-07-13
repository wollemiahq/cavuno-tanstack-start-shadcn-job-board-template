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
import { getSeoBase, listSalaryTitles } from '../server/queries'

export const Route = createFileRoute('/salaries/titles/')({
  staticData: { fullBleed: true },
  loader: async () => {
    const [titles, seo] = await Promise.all([listSalaryTitles(), getSeoBase()])
    return { titles: titles.data, seo }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.salaryHub_titlesMetaTitle({
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: m.salaryHub_titlesMetaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/titles`,
            },
          ],
        }
      : {},
  component: SalaryTitlesIndex,
})

function SalaryTitlesIndex() {
  const { titles, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const locale = seo.language

  const jsonLd = [
    itemListJsonLd(
      titles.map((t) => ({
        name: t.name,
        url: `${seo.origin}/salaries/titles/${t.slug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: m.salaryHub_jobTitlesCrumbLabel() },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  const items: RailItem[] = titles.map((t) => ({
    name: t.name,
    href: `/salaries/titles/${t.slug}`,
    range: formatRange(locale, t.avgSalaryMin, t.avgSalaryMax),
    jobCount: t.jobCount,
  }))

  return (
    <PageBody
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: m.salaryHub_jobTitlesCrumbLabel() },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">{m.salaryHub_titlesHeading()}</Text>
      </header>
      <SalaryRail vm={toSalaryRailVM('', items, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
