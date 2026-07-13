import { Text } from '@/components/text'
import { createFileRoute, getRouteApi, notFound, redirect } from '@tanstack/react-router'

import { isNotFound, type LocationSalaryDetail } from '@cavuno/board'
import { boardCopy } from '#/copy'
import {
  buildSalaryFaq,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatRange,
  locationSalaryJsonLd,
} from '@cavuno/board/seo'

import { JsonLd } from '@/components/json-ld'
import { PageBody } from '@/components/board/page-body'
import {
  SalaryEmptyState,
  OverallSalaryCard,
  SalaryFaq,
  SalaryRail,
  type RailItem,
} from '@/components/board/salary-sections'
import {
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryFaqVM,
  toSalaryRailVM,
} from '@/board/salary-view-model'
import { m } from '../paraglide/messages'
import { getLocationSalary, getSeoBase } from '../server/queries'

type City = LocationSalaryDetail['childLocations'][number]

const cityItem = (locale: string) => (x: City): RailItem => ({
  name: x.placeName,
  href: `/salaries/locations/${x.placeSlug}`,
  range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
  jobCount: x.jobCount,
})

export const Route = createFileRoute('/salaries/locations/$slug/')({
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    let salary
    try {
      salary = await getLocationSalary({ data: { slug: params.slug } })
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
    if (salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/locations/$slug',
        params: { slug: salary.canonicalSlug },
        statusCode: 308,
      })
    }
    const seo = await getSeoBase()
    return { salary, seo }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.salaryDetail_placeMetaTitle({
                place: loaderData.salary.placeName,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: loaderData.salary.overallSalary
                ? m.salaryDetail_placeMetaDescriptionWithData({
                    place: loaderData.salary.placeName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.salaryDetail_placeMetaDescriptionEmpty({
                    place: loaderData.salary.placeName,
                  }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/locations/${loaderData.salary.canonicalSlug}`,
            },
          ],
        }
      : {},
  component: LocationSalaryPage,
  notFoundComponent: () => (
    <SalaryEmptyState title={m.salaryDetail_notFoundPlace()} />
  ),
})

const rootApi = getRouteApi('__root__')

function LocationSalaryPage() {
  const { salary, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const { board } = rootApi.useLoaderData()
  const locale = seo.language

  const faqs = buildSalaryFaq(locale, salary.placeName, salary.overallSalary)
  const jsonLd = [
    locationSalaryJsonLd(salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.locations, href: `${seo.origin}/salaries/locations` },
      { label: salary.placeName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  const categoryItems: RailItem[] = salary.topCategories.map((x) => ({
    name: x.categoryName,
    href: `/salaries/titles/${x.categorySlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))
  const skillItems: RailItem[] = salary.topSkills.map((x) => ({
    name: x.skillName,
    href: `/salaries/skills/${x.skillSlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))

  return (
    <PageBody
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: crumbs.locations, href: '/salaries/locations' },
          { name: salary.placeName },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">
          {m.salaryDetail_placeHeading({ place: salary.placeName })}
        </Text>
      </header>

      {salary.overallSalary ? (
        <OverallSalaryCard
          vm={toOverallSalaryVM(
            {
              avgMin: salary.overallSalary.avgMin,
              avgMax: salary.overallSalary.avgMax,
              jobCount: salary.overallSalary.jobCount,
              medianMin: salary.overallSalary.medianMin,
              medianMax: salary.overallSalary.medianMax,
              p25Min: salary.overallSalary.p25Min,
              p75Max: salary.overallSalary.p75Max,
            },
            board.language,
            seo.labels,
          )}
        />
      ) : null}

      {salary.childLocations.length > 0 ? (
        <SalaryRail
          vm={toSalaryRailVM(
            m.salaryDetail_citiesInPlaceLabel({ place: salary.placeName }),
            salary.childLocations.map(cityItem(locale)),
            seo.language,
            seo.labels,
          )}
        />
      ) : null}

      {salary.childLocationsByRegion.map((group) => (
        <SalaryRail
          key={group.regionSlug}
          vm={toSalaryRailVM(
            group.regionName,
            group.cities.map(cityItem(locale)),
            seo.language,
            seo.labels,
          )}
        />
      ))}

      {salary.siblingLocations.length > 0 ? (
        <SalaryRail
          vm={toSalaryRailVM(
            m.salaryDetail_otherLocations(),
            salary.siblingLocations.map(cityItem(locale)),
            seo.language,
            seo.labels,
          )}
        />
      ) : null}

      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_topTitles(), categoryItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_topSkills(), skillItems, seo.language, seo.labels)} />
      <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
