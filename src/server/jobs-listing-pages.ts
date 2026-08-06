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
 *
 * Taxonomy resolve (category / skill / place) is folded into the page
 * functions below so loaders await ONE server fn instead of resolve-then-
 * fetch. Discriminated `{ kind: 'not_found' | 'redirect' | 'ok' }` lets the
 * route still throw notFound / 308 with the same targets as before.
 */
import { isNotFound } from '@cavuno/board';
import { jobsCategoryPath, jobsSkillPath } from '@cavuno/board/paths';
import { listingHead, listingJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { localizePath } from '../lib/localized-path';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { jobSearchCopy } from '@/copy-groups/job-search';
import {
  listingMetaDescription,
  listingPageTitle,
} from '@/lib/listing-description';
import type {
  EmploymentType,
  JobSort,
  JobsListQuery,
  JobsSearchBody,
  RemoteOption,
  Seniority,
  TaxonomyResolution,
} from '@cavuno/board';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects(value: unknown): JsonObject[] {
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

/** Same 404→null contract as `resolveOrNull` in queries.ts (kept private there). */
async function resolveOrNull(
  promise: Promise<TaxonomyResolution>,
): Promise<TaxonomyResolution | null> {
  try {
    return await promise;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
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
      const heading = jobSearchCopy().headingJobs;
      const head = listingHead({
        title: listingPageTitle({
          heading: heading,
          boardName: seo.boardName,
          language: seo.language,
          count: page.count,
        }),
        origin: seo.origin,
        path: localizePath('/jobs'),
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: page.count,
        }),
      });
      const crumbs = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: localizePath('/') },
            { name: crumbs.jobs },
          ],
          jobs: page.data,
        }),
      );
      return { page, seo, relatedSearches, head, jsonLd };
    }),
  );

/**
 * /jobs/$keyword — category resolve + listing + head in ONE server fn.
 *
 * Trade-off: resolve joins the same Promise.all as the listing query, so an
 * alias slug that 308-redirects still fetches a listing that is then discarded.
 * That path is rare; the common path saves a full serial round-trip wave.
 */
export const getJobsCategoryPage = createServerFn({ method: 'GET' })
  .validator(
    (input: JobsListingFiltersInput & { categorySlug: string }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      // Category resolve used to be a separate `await` in the route loader,
      // serializing an extra upstream round trip (and an extra /_serverFn hop
      // on client-side navigation) in front of the listing + SEO batch.
      const [category, list, seo] = await Promise.all([
        resolveOrNull(
          board.taxonomy.categories.resolve(data.categorySlug, { headers }),
        ),
        board.jobs.list(
          { ...filters, category: data.categorySlug },
          { headers },
        ),
        seoBase(),
      ]);
      if (!category) return { kind: 'not_found' as const };
      if (category.redirectTo) {
        return { kind: 'redirect' as const, to: category.redirectTo };
      }
      const heading = m.categoryPage_jobsHeading({
        category: category.displayName,
      });
      const head = listingHead({
        title: listingPageTitle({
          heading: heading,
          boardName: seo.boardName,
          language: seo.language,
          count: list.count,
        }),
        origin: seo.origin,
        path: localizePath(jobsCategoryPath(data.categorySlug)),
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
      });
      const crumbs = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: localizePath('/') },
            { name: crumbs.jobs, path: localizePath('/jobs') },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        kind: 'ok' as const,
        category,
        list,
        seo,
        relatedSearches: list.relatedSearches,
        head,
        jsonLd,
      };
    }),
  );

/**
 * /jobs/skills/$skill — skill resolve + listing + head in ONE server fn.
 *
 * Trade-off: resolve joins the same Promise.all as the listing query, so an
 * alias slug that 308-redirects still fetches a listing that is then discarded.
 * That path is rare; the common path saves a full serial round-trip wave.
 */
export const getJobsSkillPage = createServerFn({ method: 'GET' })
  .validator((input: JobsListingFiltersInput & { skillSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [skill, list, seo] = await Promise.all([
        resolveOrNull(
          board.taxonomy.skills.resolve(data.skillSlug, { headers }),
        ),
        board.jobs.list({ ...filters, skill: data.skillSlug }, { headers }),
        seoBase(),
      ]);
      if (!skill) return { kind: 'not_found' as const };
      if (skill.redirectTo) {
        return { kind: 'redirect' as const, to: skill.redirectTo };
      }
      const heading = m.skillPage_jobsHeading({ skill: skill.displayName });
      const head = listingHead({
        title: listingPageTitle({
          heading: heading,
          boardName: seo.boardName,
          language: seo.language,
          count: list.count,
        }),
        origin: seo.origin,
        path: localizePath(jobsSkillPath(data.skillSlug)),
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
      });
      const crumbs = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: localizePath('/') },
            { name: crumbs.jobs, path: localizePath('/jobs') },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        kind: 'ok' as const,
        skill,
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
        title: listingPageTitle({
          heading: m.jobsLocationsIndex_heading(),
          boardName: seo.boardName,
          language: seo.language,
        }),
        origin: seo.origin,
        path: localizePath('/jobs/locations'),
        description: listingMetaDescription({
          heading: m.jobsLocationsIndex_heading(),
          boardName: seo.boardName,
        }),
      });
      const crumbs = breadcrumbsCopy();
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

/**
 * /jobs/locations/$location — place resolve + listing + head in ONE server fn.
 *
 * Trade-off: resolve joins the same Promise.all as the listing query, so an
 * alias slug that 308-redirects still fetches a listing that is then discarded.
 * That path is rare; the common path saves a full serial round-trip wave.
 */
export const getJobsLocationPage = createServerFn({ method: 'GET' })
  .validator(
    (input: JobsListingFiltersInput & { locationSlug: string }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [place, list, seo] = await Promise.all([
        resolveOrNull(
          board.taxonomy.places.resolve(data.locationSlug, { headers }),
        ),
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
      if (!place) return { kind: 'not_found' as const };
      if (place.redirectTo) {
        return { kind: 'redirect' as const, to: place.redirectTo };
      }
      const relatedSearches =
        'relatedSearches' in list ? list.relatedSearches : undefined;
      const heading = m.locationPage_jobsHeading({ place: place.displayName });
      const head = listingHead({
        title: listingPageTitle({
          heading: heading,
          boardName: seo.boardName,
          language: seo.language,
          count: list.count,
        }),
        origin: seo.origin,
        path: localizePath(`/jobs/locations/${data.locationSlug}`),
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
      });
      const crumbs = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: localizePath('/') },
            { name: crumbs.jobs, path: localizePath('/jobs') },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        kind: 'ok' as const,
        place,
        list,
        seo,
        relatedSearches,
        head,
        jsonLd,
      };
    }),
  );

/**
 * /jobs/locations/$location/$keyword — place + category resolve + listing +
 * head in ONE server fn.
 *
 * Trade-off: resolve joins the same Promise.all as the listing query, so an
 * alias slug that 308-redirects still fetches a listing that is then discarded.
 * That path is rare; the common path saves a full serial round-trip wave.
 */
export const getJobsLocationCategoryPage = createServerFn({ method: 'GET' })
  .validator(
    (
      input: JobsListingFiltersInput & {
        locationSlug: string;
        categorySlug: string;
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const [place, category, list, seo] = await Promise.all([
        resolveOrNull(
          board.taxonomy.places.resolve(data.locationSlug, { headers }),
        ),
        resolveOrNull(
          board.taxonomy.categories.resolve(data.categorySlug, { headers }),
        ),
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
      if (!place || !category) return { kind: 'not_found' as const };
      if (place.redirectTo || category.redirectTo) {
        return {
          kind: 'redirect' as const,
          locationTo: place.redirectTo ?? data.locationSlug,
          keywordTo: category.redirectTo ?? data.categorySlug,
        };
      }
      const heading = m.locationCategoryPage_jobsHeading({
        category: category.displayName,
        place: place.displayName,
      });
      const head = listingHead({
        title: listingPageTitle({
          heading: heading,
          boardName: seo.boardName,
          language: seo.language,
          count: list.count,
        }),
        origin: seo.origin,
        path: localizePath(
          `/jobs/locations/${data.locationSlug}/${data.categorySlug}`,
        ),
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
      });
      const crumbs = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: localizePath('/') },
            { name: crumbs.jobs, path: localizePath('/jobs') },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        kind: 'ok' as const,
        place,
        category,
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
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      // Both resolves join the listing/SEO batch (see the sibling
      // location+category page). An alias slug still 308s — it just also
      // fetched a listing it discards, which is the rare path.
      const [place, skill, list, seo] = await Promise.all([
        resolveOrNull(
          board.taxonomy.places.resolve(data.locationSlug, { headers }),
        ),
        resolveOrNull(
          board.taxonomy.skills.resolve(data.skillSlug, { headers }),
        ),
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
      if (!place || !skill) return { kind: 'not_found' as const };
      if (place.redirectTo || skill.redirectTo) {
        return {
          kind: 'redirect' as const,
          locationTo: place.redirectTo ?? data.locationSlug,
          skillTo: skill.redirectTo ?? data.skillSlug,
        };
      }
      const heading = m.locationSkillPage_jobsHeading({
        skill: skill.displayName,
        place: place.displayName,
      });
      const head = listingHead({
        title: listingPageTitle({
          heading: heading,
          boardName: seo.boardName,
          language: seo.language,
          count: list.count,
        }),
        origin: seo.origin,
        path: localizePath(
          `/jobs/locations/${data.locationSlug}/skills/${data.skillSlug}`,
        ),
        description: listingMetaDescription({
          heading: heading,
          boardName: seo.boardName,
          count: list.count,
        }),
      });
      const crumbs = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            { name: crumbs.home, path: localizePath('/') },
            { name: crumbs.jobs, path: localizePath('/jobs') },
            { name: heading },
          ],
          jobs: list.data,
        }),
      );
      return {
        kind: 'ok' as const,
        place,
        skill,
        list,
        seo,
        relatedSearches: list.relatedSearches,
        head,
        jsonLd,
      };
    }),
  );
