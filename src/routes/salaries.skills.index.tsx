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
import { getSeoBase, listSalarySkills } from '../server/queries'

export const Route = createFileRoute('/salaries/skills/')({
  staticData: { fullBleed: true },
  loader: async () => {
    const [skills, seo] = await Promise.all([listSalarySkills(), getSeoBase()])
    return { skills: skills.data, seo }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.salaryHub_skillsMetaTitle({
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: m.salaryHub_skillsMetaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/skills`,
            },
          ],
        }
      : {},
  component: SalarySkillsIndex,
})

function SalarySkillsIndex() {
  const { skills, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const locale = seo.language

  const jsonLd = [
    itemListJsonLd(
      skills.map((s) => ({
        name: s.name,
        url: `${seo.origin}/salaries/skills/${s.slug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.skills },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  const items: RailItem[] = skills.map((s) => ({
    name: s.name,
    href: `/salaries/skills/${s.slug}`,
    range: formatRange(locale, s.avgSalaryMin, s.avgSalaryMax),
    jobCount: s.jobCount,
  }))

  return (
    <PageBody
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: crumbs.skills },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">{m.salaryHub_skillsHeading()}</Text>
      </header>
      <SalaryRail vm={toSalaryRailVM('', items, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
