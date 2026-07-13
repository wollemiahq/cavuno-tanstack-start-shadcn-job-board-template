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
import { getSeoBase, getTitleLocations } from '../server/queries'

export const Route = createFileRoute('/salaries/titles/$slug/locations')({
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    let data
    try {
      data = await getTitleLocations({ data: { slug: params.slug } })
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
    if (data.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/titles/$slug/locations',
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
              title: m.salaryDetail_titleLocationsMetaTitle({
                title: loaderData.data.categoryName,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: m.salaryDetail_titleLocationsMetaDescription({
                title: loaderData.data.categoryName,
                count: loaderData.data.locations.length,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/titles/${loaderData.data.canonicalSlug}/locations`,
            },
          ],
        }
      : {},
  component: TitleLocationsPage,
  notFoundComponent: () => (
    <SalaryEmptyState title={m.salaryDetail_notFoundTitle()} />
  ),
})

function TitleLocationsPage() {
  const { data, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const locale = seo.language
  const items: RailItem[] = data.locations.map((l) => ({
    name: l.placeName,
    href: `/salaries/titles/${data.canonicalSlug}/${l.placeSlug}`,
    range: formatRange(locale, l.avgSalaryMin, l.avgSalaryMax),
    jobCount: l.jobCount,
  }))
  const jsonLd = [
    itemListJsonLd(
      data.locations.map((l) => ({
        name: l.placeName,
        url: `${seo.origin}/salaries/titles/${data.canonicalSlug}/${l.placeSlug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.titles, href: `${seo.origin}/salaries/titles` },
      { label: data.categoryName, href: `${seo.origin}/salaries/titles/${data.canonicalSlug}` },
      { label: crumbs.locations },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  return (
    <PageBody
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: crumbs.titles, href: '/salaries/titles' },
          { name: data.categoryName, href: `/salaries/titles/${data.canonicalSlug}` },
          { name: crumbs.locations },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">
          {m.salaryDetail_titleLocationsHeading({ title: data.categoryName })}
        </Text>
      </header>
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_locationsLabel(), items, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
