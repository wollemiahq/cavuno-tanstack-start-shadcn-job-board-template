/**
 * Home `/` — the designed LANDING (CAV-495), not the bare search page.
 * The loader keeps the hosted `/` URL/search contract intact (same
 * `parseListingFilters` validation, same `listingHead`/JSON-LD, cursor
 * param) and ADDITIVELY fetches a companies page for the strip; the page
 * renders `HomeLanding` (hero + browse rail + latest jobs + companies +
 * CTA). The full search surface lives at `/jobs`.
 */
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { isForbidden } from '@cavuno/board'
import { parseListingFilters, type ListingFilters } from '@cavuno/board/filters'
import { boardCopy } from '#/copy'

import { HomeLanding } from '@/components/board/home-landing'
import { JobAlertFloatingPrompt } from '../components/job-alert-floating-prompt'
import { JsonLd } from '../components/json-ld'
import { jobAlertDefaultsFromSearch } from '../lib/job-alert-defaults'
import { listingHead, listingJsonLd } from '@cavuno/board/seo'
import {
  getBoardContext,
  getSeoBase,
  listBlogPosts,
  listCompanies,
  listJobs,
  listTalent,
  searchJobs,
} from '../server/queries'

interface JobsSearch extends ListingFilters {
  cursor?: string
}

export const Route = createFileRoute('/')({
  // Full-bleed: the landing opens with the shared gray listing hero band
  // (the same `ListingPageHeader` /jobs uses) and owns its own containers.
  staticData: { fullBleed: true },
  validateSearch: (search: Record<string, unknown>): JobsSearch => ({
    ...parseListingFilters(search),
    cursor:
      typeof search.cursor === 'string' && search.cursor
        ? search.cursor
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // Board context first — its feature flags decide which additive section
    // reads to issue (the loader fetches only what an enabled section needs).
    // The jobs / companies / seo reads start in parallel, not behind it.
    const boardP = getBoardContext()
    const jobsP = deps.q
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
            cursor: deps.cursor,
            limit: 20,
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
            cursor: deps.cursor,
            limit: 20,
            // Sparse fieldset (wire fact): descriptions ride on the slim
            // cards — what makes the honest card one-liners possible (S6).
            fields: '+description',
          },
        })
    // Additive companies read for the landing's "companies hiring" strip.
    const companiesP = listCompanies({ data: { limit: 6 } })
    const seoP = getSeoBase()

    const board = await boardP
    const [page, companies, seo, blog, talent] = await Promise.all([
      jobsP,
      companiesP,
      seoP,
      // Blog preview — only when the board runs a blog.
      board.features.blog
        ? listBlogPosts({ data: { limit: 3 } })
        : Promise.resolve(null),
      // Talent preview — only when the directory feature is on. An
      // employers-only directory 403s for an anonymous home visitor, so the
      // section is omitted rather than failing the page.
      board.features.talentDirectory
        ? listTalent({ data: { limit: 6 } }).catch((error) => {
            if (isForbidden(error)) return null
            throw error
          })
        : Promise.resolve(null),
    ])
    return {
      page,
      companies: companies.data,
      seo,
      posts: blog?.data ?? null,
      talent: talent?.data ?? null,
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: '/',
          heading: boardCopy(loaderData.seo.language, loaderData.seo.labels)
            .jobSearch.headingJobs,
          count: loaderData.page.count,
        })
      : {},
  component: HomePage,
})

const rootApi = getRouteApi('__root__')

function HomePage() {
  const { page, companies, seo, posts, talent } = Route.useLoaderData()
  const search = Route.useSearch()
  const { board } = rootApi.useLoaderData()

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
      <HomeLanding
        jobs={page.data}
        count={page.count}
        companies={companies}
        posts={posts}
        talent={talent}
        language={board.language}
        labels={board.labels}
        boardName={board.name}
        candidatesEnabled={board.features.candidates}
        employersEnabled={board.features.employers}
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
