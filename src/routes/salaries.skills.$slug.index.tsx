import { Text } from '@/components/text'
import { createFileRoute, getRouteApi, notFound, redirect } from '@tanstack/react-router'

import { isNotFound } from '@cavuno/board'
import { boardCopy } from '#/copy'
import {
  buildSalaryFaq,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatRange,
  skillSalaryJsonLd,
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
import { getSeoBase, getSkillSalary } from '../server/queries'

export const Route = createFileRoute('/salaries/skills/$slug/')({
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    let salary
    try {
      salary = await getSkillSalary({ data: { slug: params.slug } })
    } catch (error) {
      if (isNotFound(error)) throw notFound()
      throw error
    }
    if (salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/skills/$slug',
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
              title: m.salaryDetail_skillMetaTitle({
                skill: loaderData.salary.skillName,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: loaderData.salary.overallSalary
                ? m.salaryDetail_skillMetaDescriptionWithData({
                    skill: loaderData.salary.skillName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.salaryDetail_skillMetaDescriptionEmpty({
                    skill: loaderData.salary.skillName,
                  }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/skills/${loaderData.salary.canonicalSlug}`,
            },
          ],
        }
      : {},
  component: SkillSalaryPage,
  notFoundComponent: () => (
    <SalaryEmptyState title={m.salaryDetail_notFoundSkill()} />
  ),
})

const rootApi = getRouteApi('__root__')

function SkillSalaryPage() {
  const { salary, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const { board } = rootApi.useLoaderData()
  const locale = seo.language

  const faqs = buildSalaryFaq(locale, salary.skillName, salary.overallSalary)
  const jsonLd = [
    skillSalaryJsonLd(salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.skills, href: `${seo.origin}/salaries/skills` },
      { label: salary.skillName },
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
  const titleItems: RailItem[] = salary.topTitles.map((x) => ({
    name: x.categoryName,
    href: `/salaries/titles/${x.categorySlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))
  const relatedItems: RailItem[] = salary.relatedSkills.map((x) => ({
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
          { name: crumbs.skills, href: '/salaries/skills' },
          { name: salary.skillName },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">
          {m.salaryDetail_skillHeading({ skill: salary.skillName })}
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

      {salary.bySeniority.length > 0 ? (
        <section className="space-y-3">
          <Text as="h2" variant="heading4">{m.salaryDetail_seniorityHeading()}</Text>
          <SenioritySalaryTable vm={toSeniorityTableVM(salary.bySeniority, board.language, seo.labels)} />
        </section>
      ) : null}

      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_topCompanies(), companyItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_topLocations(), locationItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_topTitles(), titleItems, seo.language, seo.labels)} />
      <SalaryRail vm={toSalaryRailVM(m.salaryDetail_relatedSkills(), relatedItems, seo.language, seo.labels)} />
      <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language, seo.labels)} />
      </div>
    </PageBody>
  )
}
