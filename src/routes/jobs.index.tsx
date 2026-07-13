/**
 * The canonical jobs listing at `/jobs` — parity with the hosted board,
 * whose canonical jobs listing is `/jobs` (the home `/` is a landing).
 * A board migrating hosted → headless keeps its indexed `/jobs` URL.
 * Same listing surface as `/`, distinct canonical.
 */
import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'

import { parseListingFilters, type ListingFilters } from '@cavuno/board/filters'
import { boardCopy } from '#/copy'

import { pageSearchValue, pageToOffset, parsePageParam } from '../lib/pagination'
import { JobSearchPage } from '@/components/board/job-search-page'
import { LocationCombobox } from '../components/location-combobox'
import { JobAlertFloatingPrompt } from '../components/job-alert-floating-prompt'
import { JsonLd } from '../components/json-ld'
import { jobAlertDefaultsFromSearch } from '../lib/job-alert-defaults'
import { listingHead, listingJsonLd } from '@cavuno/board/seo'
import { getSeoBase, listJobs, searchJobs } from '../server/queries'
import { useLocationSuggestions } from './-use-location-suggestions'

interface JobsSearch extends ListingFilters {
  /** 1-based page; page 1 drops from the URL (clean canonical). */
  page?: number
}

const JOBS_PAGE_SIZE = 20

export const Route = createFileRoute('/jobs/')({
  // Full-bleed: the page opens with the Lumen-style gray hero band
  // (CAV-497) and owns its own containers.
  staticData: { fullBleed: true },
  validateSearch: (search: Record<string, unknown>): JobsSearch => ({
    ...parseListingFilters(search),
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const offset = pageToOffset(deps.page ?? 1, JOBS_PAGE_SIZE)
    const [page, seo] = await Promise.all([
      deps.q
        ? searchJobs({
            data: {
              query: deps.q,
              filters: {
                remoteOption: deps.remoteOption
                  ? [deps.remoteOption]
                  : undefined,
                employmentType: deps.employmentType
                  ? [deps.employmentType]
                  : undefined,
                seniority: deps.seniority?.length ? deps.seniority : undefined,
              },
              sort: deps.sort,
              offset,
              limit: JOBS_PAGE_SIZE,
            },
          })
        : listJobs({
            data: {
              remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
              employmentType: deps.employmentType
                ? [deps.employmentType]
                : undefined,
              seniority: deps.seniority?.length ? deps.seniority : undefined,
              sort: deps.sort,
              offset,
              limit: JOBS_PAGE_SIZE,
              fields: '+description',
            },
          }),
      getSeoBase(),
    ])
    return { page, seo }
  },
  head: ({ loaderData }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: '/jobs',
          heading: boardCopy(loaderData.seo.language, loaderData.seo.labels)
            .jobSearch.headingJobs,
          count: loaderData.page.count,
        })
      : {},
  component: JobsPage,
})

const rootApi = getRouteApi('__root__')

function JobsPage() {
  const { page, seo } = Route.useLoaderData()
  const search = Route.useSearch()
  const { board } = rootApi.useLoaderData()
  const navigate = useNavigate({ from: '/jobs/' })
  const locationSuggestions = useLocationSuggestions(board.language)

  return (
    <>
      <JsonLd
        data={listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: boardCopy(board.language, board.labels).breadcrumbs.jobs },
          ],
          jobs: page.data,
        })}
      />
      <JobSearchPage
        breadcrumb={{
          ariaLabel: boardCopy(board.language, board.labels).jobDetail.breadcrumbAriaLabel,
          items: [
            { name: boardCopy(board.language, board.labels).breadcrumbs.home, href: '/' },
            { name: boardCopy(board.language, board.labels).breadcrumbs.jobs },
          ],
        }}
        jobs={page.data}
        count={page.count}
        page={search.page ?? 1}
        pageSize={JOBS_PAGE_SIZE}
        filters={search}
        language={board.language}
        labels={board.labels}
        relatedSearches={"relatedSearches" in page ? page.relatedSearches : undefined}
        onFiltersChange={(next) =>
          navigate({ to: '/jobs', search: () => ({ ...next }) })
        }
        onPageChange={(next) =>
          navigate({
            to: '/jobs',
            search: (prev) => ({ ...prev, page: pageSearchValue(next) }),
          })
        }
        locationSlot={
          <LocationCombobox
            {...locationSuggestions}
            onSelect={({ slug }) =>
              navigate({
                to: '/jobs/locations/$location',
                params: { location: slug },
              })
            }
            onClear={() => {}}
          />
        }
      />
      {board.features.jobAlerts ? (
        <JobAlertFloatingPrompt
          language={board.language}
          labels={board.labels}
          defaults={jobAlertDefaultsFromSearch({
            keyword: search.q,
            source: 'board_home',
          })}
        />
      ) : null}
    </>
  )
}
