/**
 * Route-family-owned server boundary for jobs listing pages.
 *
 * TanStack route loaders/head are isomorphic and remain in the universal
 * client entry. Importing `@cavuno/board/seo` (`listingHead`, `listingJsonLd`)
 * and listing copy families into those route modules pulls SEO builders and
 * large message catalogs into the shared shell. Computing head (+ JSON-LD
 * where needed) inside these handlers keeps the client on the server-function
 * stubs only — same pattern as getSalaryHubPage / getJobDetailPage.
 *
 * Family scope: /jobs, /jobs/$keyword, /jobs/skills/$skill, locations tree.
 * getSeoBase/listJobs/searchJobs stay exported from queries.ts for other
 * callers; these page functions fold getSeoBase into each listing read so
 * client navigation does not grow a head-only round trip.
 */
import { jobsCategoryPath, jobsSkillPath } from '@cavuno/board/paths';
import { listingHead, listingJsonLd } from '@cavuno/board/seo';

import { listingMetaDescription } from '@/lib/listing-description';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { jobSearchCopy } from '@/copy-groups/job-search';
import type {
  EmploymentType,
  JobSort,
  JobsListQuery,
  JobsSearchBody,
  RemoteOption,
  Seniority,
} from '@cavuno/board';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects(value: unknown): JsonObject[] {
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

/** Shared listing filter slice used by every jobs listing page function. */
export type JobsListingFiltersInput = {
  remoteOption?: RemoteOption;
  employmentType?: EmploymentType;
  seniority?: Seniority[];
  sort?: JobSort;
  offset: number;
  limit: number;
  /** Free-text query (location index + jobs index only). */
  q?: string;
};

function listFilters(
  input: JobsListingFiltersInput,
): Pick<
  JobsListQuery,
  'remoteOption' | 'employmentType' | 'seniority' | 'sort' | 'offset' | 'limit'
> {
  return {
    remoteOption: input.remoteOption ? [input.remoteOption] : undefined,
    employmentType: input.employmentType ? [input.employmentType] : undefined,
    seniority: input.seniority?.length ? input.seniority : undefined,
    sort: input.sort,
    offset: input.offset,
    limit: input.limit,
  };
}

async function seoBase() {
  // Board context is an OPEN read (password wall does not gate it), matching
  // getSeoBase / getJobDetailPage.
  const boardContext = await getBoard().context();
  const origin = new URL(getRequest().url).origin;
  return {
    boardName: boardContext.name,
    language: boardContext.language,
    origin,
  };
}

/** Canonical /jobs listing — list or search + head (jobSearch headingJobs). */
export const getJobsIndexPage = createServerFn({ method: 'GET' })
  .validator((input: JobsListingFiltersInput) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [page, seo] = await Promise.all([
        data.q
          ? board.jobs.search(
              {
                query: data.q,
                filters: {
                  remoteOption: filters.remoteOption,
                  employmentType: filters.employmentType,
                  seniority: filters.seniority,
                },
                sort: filters.sort,
                offset: filters.offset,
                limit: filters.limit,
              } satisfies JobsSearchBody,
              undefined,
              { headers },
            )
          : board.jobs.list(
              { ...filters, fields: '+description' },
              { headers },
            ),
        seoBase(),
      ]);
      const relatedSearches =
        'relatedSearches' in page ? page.relatedSearches : undefined;
      const heading = jobSearchCopy(seo.language).headingJobs;
      const head = listingHead({
        ...seo,
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: page.count,
        }),
        path: '/jobs',
        heading,
        count: page.count,
      });
      const crumbs = breadcrumbsCopy(seo.language);
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: '/' },
            { name: crumbs.jobs },
          ],
          jobs: page.data,
        }),
      );
      return { page, seo, relatedSearches, head, jsonLd };
    }),
  );

/** /jobs/$keyword — category listing + head. Resolve stays in the route. */
export const getJobsCategoryPage = createServerFn({ method: 'GET' })
  .validator(
    (
      input: JobsListingFiltersInput & {
        categorySlug: string;
        displayName: string;
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [list, seo] = await Promise.all([
        board.jobs.list(
          { ...filters, category: data.categorySlug },
          { headers },
        ),
        seoBase(),
      ]);
      const heading = m.categoryPage_jobsHeading({
        category: data.displayName,
      });
      const head = listingHead({
        ...seo,
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
        path: jobsCategoryPath(data.categorySlug),
        heading,
        count: list.count,
      });
      const crumbs = breadcrumbsCopy(seo.language);
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: '/' },
            { name: crumbs.jobs, path: '/jobs' },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        list,
        seo,
        relatedSearches: list.relatedSearches,
        head,
        jsonLd,
      };
    }),
  );

/** /jobs/skills/$skill — skill listing + head. */
export const getJobsSkillPage = createServerFn({ method: 'GET' })
  .validator(
    (
      input: JobsListingFiltersInput & {
        skillSlug: string;
        displayName: string;
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [list, seo] = await Promise.all([
        board.jobs.list({ ...filters, skill: data.skillSlug }, { headers }),
        seoBase(),
      ]);
      const heading = m.skillPage_jobsHeading({ skill: data.displayName });
      const head = listingHead({
        ...seo,
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
        path: jobsSkillPath(data.skillSlug),
        heading,
        count: list.count,
      });
      const crumbs = breadcrumbsCopy(seo.language);
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: '/' },
            { name: crumbs.jobs, path: '/jobs' },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        list,
        seo,
        relatedSearches: list.relatedSearches,
        head,
        jsonLd,
      };
    }),
  );

/** /jobs/locations/ directory — places + head + breadcrumb JSON-LD. */
export const getJobsLocationsIndexPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [places, seo] = await Promise.all([
        board.taxonomy.places.list(undefined, { headers }),
        seoBase(),
      ]);
      const head = listingHead({
        ...seo,
        description: listingMetaDescription({
          heading: m.jobsLocationsIndex_heading(),
          boardName: seo.boardName,
        }),
        path: '/jobs/locations',
        heading: m.jobsLocationsIndex_heading(),
      });
      const crumbs = breadcrumbsCopy(seo.language);
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.jobs, path: '/' },
            { name: crumbs.locations },
          ],
        }),
      );
      return { places, seo, head, jsonLd };
    }),
  );

/** /jobs/locations/$location — place listing (list or search) + head. */
export const getJobsLocationPage = createServerFn({ method: 'GET' })
  .validator(
    (
      input: JobsListingFiltersInput & {
        locationSlug: string;
        displayName: string;
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [list, seo] = await Promise.all([
        data.q
          ? board.jobs.search(
              {
                query: data.q,
                filters: {
                  location: data.locationSlug,
                  remoteOption: filters.remoteOption,
                  employmentType: filters.employmentType,
                  seniority: filters.seniority,
                },
                sort: filters.sort,
                offset: filters.offset,
                limit: filters.limit,
              } satisfies JobsSearchBody,
              undefined,
              { headers },
            )
          : board.jobs.list(
              { ...filters, location: data.locationSlug },
              { headers },
            ),
        seoBase(),
      ]);
      const relatedSearches =
        'relatedSearches' in list ? list.relatedSearches : undefined;
      const heading = m.locationPage_jobsHeading({ place: data.displayName });
      const head = listingHead({
        ...seo,
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
        path: `/jobs/locations/${data.locationSlug}`,
        heading,
        count: list.count,
      });
      const crumbs = breadcrumbsCopy(seo.language);
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: '/' },
            { name: crumbs.jobs, path: '/jobs' },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return { list, seo, relatedSearches, head, jsonLd };
    }),
  );

/** /jobs/locations/$location/$keyword — place + category listing + head. */
export const getJobsLocationCategoryPage = createServerFn({ method: 'GET' })
  .validator(
    (
      input: JobsListingFiltersInput & {
        locationSlug: string;
        categorySlug: string;
        placeDisplayName: string;
        categoryDisplayName: string;
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [list, seo] = await Promise.all([
        board.jobs.list(
          {
            ...filters,
            location: data.locationSlug,
            category: data.categorySlug,
          },
          { headers },
        ),
        seoBase(),
      ]);
      const heading = m.locationCategoryPage_jobsHeading({
        category: data.categoryDisplayName,
        place: data.placeDisplayName,
      });
      const head = listingHead({
        ...seo,
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
        path: `/jobs/locations/${data.locationSlug}/${data.categorySlug}`,
        heading,
        count: list.count,
      });
      const crumbs = breadcrumbsCopy(seo.language);
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: '/' },
            { name: crumbs.jobs, path: '/jobs' },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        list,
        seo,
        relatedSearches: list.relatedSearches,
        head,
        jsonLd,
      };
    }),
  );

/** /jobs/locations/$location/skills/$skill — place + skill listing + head. */
export const getJobsLocationSkillPage = createServerFn({ method: 'GET' })
  .validator(
    (
      input: JobsListingFiltersInput & {
        locationSlug: string;
        skillSlug: string;
        placeDisplayName: string;
        skillDisplayName: string;
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [list, seo] = await Promise.all([
        board.jobs.list(
          {
            ...filters,
            location: data.locationSlug,
            skill: data.skillSlug,
          },
          { headers },
        ),
        seoBase(),
      ]);
      const heading = m.locationSkillPage_jobsHeading({
        skill: data.skillDisplayName,
        place: data.placeDisplayName,
      });
      const head = listingHead({
        ...seo,
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
        path: `/jobs/locations/${data.locationSlug}/skills/${data.skillSlug}`,
        heading,
        count: list.count,
      });
      const crumbs = breadcrumbsCopy(seo.language);
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: '/' },
            { name: crumbs.jobs, path: '/jobs' },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        list,
        seo,
        relatedSearches: list.relatedSearches,
        head,
        jsonLd,
      };
    }),
  );
