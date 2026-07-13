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
import { getLocationTitles, getSeoBase } from '../server/queries'

export const Route = createFileRoute('/salaries/locations/$slug/titles')({
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    let data
    try {
      data = await getLocationTitles({ data: { slug: params.slug } })
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
    if (data.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/locations/$slug/titles',
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
              title: m.salaryDetail_titlesInPlaceMetaTitle({
                place: loaderData.data.placeName,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: m.salaryDetail_titlesInPlaceMetaDescription({
                place: loaderData.data.placeName,
                count: loaderData.data.titles.length,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/locations/${loaderData.data.canonicalSlug}/titles`,
            },
          ],
        }
      : {},
  component: LocationTitlesPage,
  notFoundComponent: () => (
    <SalaryEmptyState title={m.salaryDetail_notFoundPlace()} />
  ),
})

function LocationTitlesPage() {
  const { data, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const locale = seo.language
  const items: RailItem[] = data.titles.map((t) => ({
    name: t.name,
    href: `/salaries/titles/${t.slug}/${data.canonicalSlug}`,
    range: formatRange(locale, t.avgSalaryMin, t.avgSalaryMax),
    jobCount: t.jobCount,
  }))
  const jsonLd = [
    itemListJsonLd(
      data.titles.map((t) => ({
        name: t.name,
        url: `${seo.origin}/salaries/titles/${t.slug}/${data.canonicalSlug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.locations, href: `${seo.origin}/salaries/locations` },
      { label: data.placeName, href: `${seo.origin}/salaries/locations/${data.canonicalSlug}` },
      { label: crumbs.titles },
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
          { name: crumbs.titles },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">
          {m.salaryDetail_titlesInPlaceHeading({ place: data.placeName })}
        </Text>
      </header>
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_jobTitlesLabel(), items, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
