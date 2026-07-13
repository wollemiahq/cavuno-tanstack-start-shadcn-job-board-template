import { Text } from '@/components/text'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { type SalaryLocation } from '@cavuno/board'
import { boardCopy } from '#/copy'
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo'

import { JsonLd } from '@/components/json-ld'
import { PageBody } from '@/components/board/page-body'
import { toSalaryBreadcrumbVM } from '@/board/salary-view-model'
import { m } from '../paraglide/messages'
import { getSeoBase, listSalaryLocations } from '../server/queries'

const rootApi = getRouteApi('__root__')

export const Route = createFileRoute('/salaries/locations/')({
  staticData: { fullBleed: true },
  loader: async () => {
    const [locations, seo] = await Promise.all([
      listSalaryLocations(),
      getSeoBase(),
    ])
    return { locations: locations.data, seo }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.salaryHub_locationsMetaTitle({
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: m.salaryHub_locationsMetaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/locations`,
            },
          ],
        }
      : {},
  component: SalaryLocationsIndex,
})

// Rebuild the country → region → city tree from the flat parentSlug list.
function childrenByParent(items: SalaryLocation[]) {
  const map = new Map<string | null, SalaryLocation[]>()
  for (const it of items) {
    const arr = map.get(it.parentSlug) ?? []
    arr.push(it)
    map.set(it.parentSlug, arr)
  }
  return map
}

function LocationTree({
  parentSlug,
  byParent,
}: {
  parentSlug: string | null
  byParent: Map<string | null, SalaryLocation[]>
}) {
  const { board } = rootApi.useLoaderData()
  const nodes = byParent.get(parentSlug) ?? []
  if (nodes.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {nodes.map((n) => (
        <li key={n.placeSlug}>
          <a
            href={`/salaries/locations/${n.placeSlug}`}
            className="rounded-xs font-medium text-secondary outline-focus-ring transition-colors hover:text-primary hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {n.placeName}
          </a>
          <span className="text-sm tabular-nums text-tertiary">
            {' · '}
            {formatRange(board.language, n.avgSalaryMin, n.avgSalaryMax)}
            {' · '}
            {n.jobCount === 1
              ? m.salaryHub_jobCountSingular({ count: n.jobCount })
              : m.salaryHub_jobCountPlural({ count: n.jobCount })}
          </span>
          {byParent.has(n.placeSlug) ? (
            <div className="mt-1 ml-3 border-l border-secondary pl-3">
              <LocationTree parentSlug={n.placeSlug} byParent={byParent} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function SalaryLocationsIndex() {
  const { locations, seo } = Route.useLoaderData()
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs
  const byParent = childrenByParent(locations)

  const jsonLd = [
    itemListJsonLd(
      locations.map((l) => ({
        name: l.placeName,
        url: `${seo.origin}/salaries/locations/${l.placeSlug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.locations },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null)

  return (
    <PageBody
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: crumbs.locations },
        ],
        seo.language,
        seo.labels,
      )}
    >
      <div className="space-y-6">
      <JsonLd data={jsonLd} />
      <header>
        <Text as="h1" variant="heading1">{m.salaryHub_locationsHeading()}</Text>
      </header>
      <LocationTree parentSlug={null} byParent={byParent} />
      </div>
    </PageBody>
  )
}
