import { Text } from '@/components/text'
import { createFileRoute } from '@tanstack/react-router'

import { createBreadcrumbJsonLd, formatRange } from '@cavuno/board/seo'
import { boardCopy } from '#/copy'

import { Button } from '@/components/base/buttons/button'
import { JsonLd } from '@/components/json-ld'
import { PageBody } from '@/components/board/page-body'
import { SalaryRail, type RailItem } from '@/components/board/salary-sections'
import { toSalaryBreadcrumbVM, toSalaryRailVM } from '@/board/salary-view-model'
import { m } from '../paraglide/messages'
import {
  getSeoBase,
  listSalaryCompanies,
  listSalaryLocations,
  listSalarySkills,
  listSalaryTitles,
} from '../server/queries'

const PREVIEW = 9

export const Route = createFileRoute('/salaries/')({
  // Full-bleed so PageBody owns the container + the breadcrumb placement.
  staticData: { fullBleed: true },
  loader: async () => {
    const [companies, titles, skills, locations, seo] = await Promise.all([
      listSalaryCompanies(),
      listSalaryTitles(),
      listSalarySkills(),
      listSalaryLocations(),
      getSeoBase(),
    ])
    return {
      companies: companies.data,
      titles: titles.data,
      skills: skills.data,
      // Top-level places only (the hub preview); the index page shows the tree.
      locations: locations.data.filter((l) => l.parentSlug === null),
      seo,
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: m.salaryHub_metaTitle({ boardName: loaderData.seo.boardName }) },
            {
              name: 'description',
              content: m.salaryHub_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            { rel: 'canonical', href: `${loaderData.seo.origin}/salaries` },
          ],
        }
      : {},
  component: SalariesHub,
})

function SalariesHub() {
  const { companies, titles, skills, locations, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const locale = seo.language

  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  const companyItems: RailItem[] = companies.slice(0, PREVIEW).map((x) => ({
    name: x.companyName,
    href: `/companies/${x.companySlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }))
  const titleItems: RailItem[] = titles.slice(0, PREVIEW).map((x) => ({
    name: x.name,
    href: `/salaries/titles/${x.slug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))
  const skillItems: RailItem[] = skills.slice(0, PREVIEW).map((x) => ({
    name: x.name,
    href: `/salaries/skills/${x.slug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))
  const locationItems: RailItem[] = locations.slice(0, PREVIEW).map((x) => ({
    name: x.placeName,
    href: `/salaries/locations/${x.placeSlug}`,
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }))

  return (
    <PageBody breadcrumb={toSalaryBreadcrumbVM([{ name: crumbs.home, href: '/' }, { name: crumbs.salaries }], seo.language, seo.labels)}>
      <JsonLd data={jsonLd} />
      <header className="flex max-w-3xl flex-col gap-4">
        <Text as="h1" variant="display">
          {crumbs.salaries}
        </Text>
        <p className="text-lg text-tertiary">
          {m.salaryHub_subheading()}
        </p>
      </header>

      <HubSection title={crumbs.companies} seeAll="/salaries/companies" items={companyItems} seo={seo} />
      <HubSection title={crumbs.titles} seeAll="/salaries/titles" items={titleItems} seo={seo} />
      <HubSection title={crumbs.skills} seeAll="/salaries/skills" items={skillItems} seo={seo} />
      <HubSection title={crumbs.locations} seeAll="/salaries/locations" items={locationItems} seo={seo} />
    </PageBody>
  )
}

function HubSection({
  title,
  seeAll,
  items,
  seo,
}: {
  title: string
  seeAll: string
  items: RailItem[]
  seo: { language: string; labels: Record<string, Record<string, string>> }
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <Text as="h2" variant="heading4">{title}</Text>
        <Button color="link-color" size="sm" href={seeAll}>
          {m.salaryHub_seeAllLabel()}
        </Button>
      </div>
      <SalaryRail vm={toSalaryRailVM('', items, seo.language, seo.labels)} />
    </div>
  )
}
