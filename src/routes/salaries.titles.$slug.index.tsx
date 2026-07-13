import { Text } from '@/components/text'
import { createFileRoute, getRouteApi, notFound, redirect } from '@tanstack/react-router'

import { isNotFound } from '@cavuno/board'
import { boardCopy } from '#/copy'
import {
  buildSalaryFaq,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatRange,
  titleSalaryJsonLd,
} from '@cavuno/board/seo'

import { JsonLd } from '@/components/json-ld'
import { PageBody } from '@/components/board/page-body'
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
import { getSeoBase, getTitleSalary } from '../server/queries'

export const Route = createFileRoute('/salaries/titles/$slug/')({
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    let salary
    try {
      salary = await getTitleSalary({ data: { slug: params.slug } })
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
    // The API returns the board-language canonical slug as data and never 308s;
    // the starter performs the redirect (S3), mirroring the hosted board.
    if (salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/titles/$slug',
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
              title: m.salaryDetail_titleMetaTitle({
                title: loaderData.salary.categoryName,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: loaderData.salary.overallSalary
                ? m.salaryDetail_titleMetaDescriptionWithData({
                    title: loaderData.salary.categoryName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.salaryDetail_titleMetaDescriptionEmpty({
                    title: loaderData.salary.categoryName,
                  }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/titles/${loaderData.salary.canonicalSlug}`,
            },
          ],
        }
      : {},
  component: TitleSalaryPage,
  notFoundComponent: () => (
    <SalaryEmptyState title={m.salaryDetail_notFoundTitle()} />
  ),
})

const rootApi = getRouteApi('__root__')

function TitleSalaryPage() {
  const { salary, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const { board } = rootApi.useLoaderData()
  const locale = seo.language

  const faqs = buildSalaryFaq(locale, salary.categoryName, salary.overallSalary)
  const jsonLd = [
    titleSalaryJsonLd(locale, salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.titles, href: `${seo.origin}/salaries/titles` },
      { label: salary.categoryName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  const companyItems: RailItem[] = salary.topCompanies.map((x) => ({
    name: x.companyName,
    href: `/companies/${x.companySlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }))
  const locationItems: RailItem[] = salary.topLocations.map((x) => ({
    name: x.placeName,
    href: `/salaries/locations/${x.placeSlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))
  const skillItems: RailItem[] = salary.topSkills.map((x) => ({
    name: x.skillName,
    href: `/salaries/skills/${x.skillSlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))
  const relatedItems: RailItem[] = salary.relatedTitles.map((x) => ({
    name: x.categoryName,
    href: `/salaries/titles/${x.categorySlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))

  return (
    <PageBody
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: crumbs.titles, href: '/salaries/titles' },
          { name: salary.categoryName },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">
          {m.salaryDetail_titleHeading({ title: salary.categoryName })}
        </Text>
      </header>

      {salary.overallSalary ? (
        <OverallSalaryCard
          vm={toOverallSalaryVM(
            {
              avgMin: salary.overallSalary.avgMin,
              avgMax: salary.overallSalary.avgMax,
              jobCount: salary.overallSalary.jobCount,
              p25Min: salary.overallSalary.p25Min,
              p75Max: salary.overallSalary.p75Max,
            },
            board.language,
            seo.labels,
          )}
        />
      ) : null}

      {salary.bySeniority.length > 0 ? (
        <section className="space-y-3">
          <Text as="h2" variant="heading4">{m.salaryDetail_seniorityHeading()}</Text>
          <SenioritySalaryTable vm={toSeniorityTableVM(salary.bySeniority, board.language, seo.labels)} />
        </section>
      ) : null}

      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_topCompanies(), companyItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_topLocations(), locationItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_topSkills(), skillItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_relatedTitles(), relatedItems, seo.language, seo.labels)} />
      <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
