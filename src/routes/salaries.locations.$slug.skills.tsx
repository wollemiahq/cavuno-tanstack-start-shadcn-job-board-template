import { Text } from '@/components/text'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

import { isNotFound } from '@cavuno/board'
import { boardCopy } from '#/copy'
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo'

import { JsonLd } from '@/components/json-ld'
import { PageBody } from '@/components/board/page-body'
import { SalaryEmptyState, SalaryRail, type RailItem } from '@/components/board/salary-sections'
import { toSalaryBreadcrumbVM, toSalaryRailVM } from '@/board/salary-view-model'
import { m } from '../paraglide/messages'
import { getLocationSkills, getSeoBase } from '../server/queries'

export const Route = createFileRoute('/salaries/locations/$slug/skills')({
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    let data
    try {
      data = await getLocationSkills({ data: { slug: params.slug } })
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
    if (data.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/locations/$slug/skills',
        params: { slug: data.canonicalSlug },
        statusCode: 308,
      })
    }
    const seo = await getSeoBase()
    return { data, seo }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.salaryDetail_skillsInPlaceMetaTitle({
                place: loaderData.data.placeName,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: m.salaryDetail_skillsInPlaceMetaDescription({
                place: loaderData.data.placeName,
                count: loaderData.data.skills.length,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/locations/${loaderData.data.canonicalSlug}/skills`,
            },
          ],
        }
      : {},
  component: LocationSkillsPage,
  notFoundComponent: () => (
    <SalaryEmptyState title={m.salaryDetail_notFoundPlace()} />
  ),
})

function LocationSkillsPage() {
  const { data, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const locale = seo.language
  const items: RailItem[] = data.skills.map((s) => ({
    name: s.name,
    href: `/salaries/skills/${s.slug}/${data.canonicalSlug}`,
    range: formatRange(locale, s.avgSalaryMin, s.avgSalaryMax),
    jobCount: s.jobCount,
  }))
  const jsonLd = [
    itemListJsonLd(
      data.skills.map((s) => ({
        name: s.name,
        url: `${seo.origin}/salaries/skills/${s.slug}/${data.canonicalSlug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.locations, href: `${seo.origin}/salaries/locations` },
      { label: data.placeName, href: `${seo.origin}/salaries/locations/${data.canonicalSlug}` },
      { label: crumbs.skills },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  return (
    <PageBody
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: crumbs.locations, href: '/salaries/locations' },
          { name: data.placeName, href: `/salaries/locations/${data.canonicalSlug}` },
          { name: crumbs.skills },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">
          {m.salaryDetail_skillsInPlaceHeading({ place: data.placeName })}
        </Text>
      </header>
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_skillsLabel(), items, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
