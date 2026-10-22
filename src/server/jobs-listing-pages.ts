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
import {
  BOARD_PATHS,
  jobsCategoryPath,
  jobsLocationCategoryPath,
  jobsLocationSkillPath,
  jobsSkillPath,
} from '@cavuno/board/paths';
import { listingHead, listingJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { localizePath } from '../lib/localized-path';
import { readPublicOrigin } from '../lib/public-origin';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { gatedRead } from './board-access';
import {
  combinationInPlaceCountCache,
  listingCacheKey,
  jobsRadiusParams,
  listingRadiusKm,
} from './listing-place-cache';
import {
  noindexFollow,
  resolveOrNull,
  settled,
  trailBreadcrumbJsonLd,
} from './place-listing-helpers';

import {
  customFieldLabel,
  customFieldOptionLabel,
} from '@/board/custom-field-labels';
import { catalogJobCount } from '@/board/job-catalog-count';
import { toJobsLocationHierarchyCrumbs } from '@/board/jobs-location-hierarchy';
import {
  isSearchRadiusViewNoindex,
  placeJobCount,
  placeSearchRadius,
} from '@/board/search-radius';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { jobSearchCopy } from '@/copy-groups/job-search';
import {
  customFieldFiltersOrUndefined,
  hasCustomFieldSearch,
  resolveCustomFieldFilters,
  toCustomFilterFields,
  type CustomFieldSearch,
} from '@/lib/custom-field-filters';
import {
  jobsIndexPageTitle,
  listingMetaDescription,
  listingPageTitle,
  type CountedHeading,
} from '@/lib/listing-description';
import { reachableCountOf, readReachablePage } from '@/lib/pagination';
import type {
  EmploymentType,
  JobSort,
  JobsListQuery,
  JobsSearchBody,
  PublicPlace,
  RemoteOption,
  Seniority,
  TaxonomyResolution,
} from '@cavuno/board';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: Structured data is composed from literal schema.org objects and
  // SDK SEO builders, then JSON round-tripped to erase readonly helper types.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

/** Shared listing filter slice used by every jobs listing page function. */
export type JobsListingFiltersInput = {
  remoteOption?: RemoteOption;
  employmentType?: EmploymentType;
  /** A board custom employment type key (`customEmploymentType=` in the URL). */
  customEmploymentType?: string;
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
  | 'remoteOption'
  | 'employmentType'
  | 'customEmploymentType'
  | 'seniority'
  | 'sort'
  | 'offset'
  | 'limit'
> {
  return {
    remoteOption: input.remoteOption ? [input.remoteOption] : undefined,
    employmentType: input.employmentType ? [input.employmentType] : undefined,
    customEmploymentType: input.customEmploymentType
      ? [input.customEmploymentType]
      : undefined,
    seniority: input.seniority?.length ? input.seniority : undefined,
    sort: input.sort,
    offset: input.offset,
    limit: input.limit,
  };
}

/**
 * Mark a read started ahead of an `await` as handled, so a rejection that
 * lands before the batch that consumes it is not reported as unhandled. The
 * returned promise still rejects for that batch.
 */
function startedEarly<T>(read: Promise<T>): Promise<T> {
  read.catch(() => undefined);
  return read;
}

async function seoBase() {
  // Board context is an OPEN read (password wall does not gate it), matching
  // getSeoBase / getJobDetailPage.
  const [boardContext, origin] = await Promise.all([
    readBoardContext(),
    readPublicOrigin(),
  ]);
  return {
    boardName: boardContext.name,
    language: boardContext.language,
    origin,
  };
}

/**
 * The plain URL's own view: first page, no filter, sort, query or chosen
 * distance. Other views canonicalize to it, so only it decides indexing.
 */
function isPlainListingView(
  data: JobsListingFiltersInput & { within?: number },
): boolean {
  return (
    data.offset === 0 &&
    data.within === undefined &&
    !data.q &&
    !data.remoteOption &&
    !data.employmentType &&
    !data.customEmploymentType &&
    !data.seniority?.length &&
    !data.sort
  );
}

/**
 * Split a taxonomy resolution's intro off it. The API contract shows the
 * intro only on the plain landing view (page 1, no query or filter), so other
 * views get none and the resolution never carries it to the page.
 */
function landingIntro<T extends { introHtml?: string }>(
  resolution: T,
  data: JobsListingFiltersInput & { within?: number },
) {
  const { introHtml, ...rest } = resolution;
  return {
    resolution: rest,
    introHtml: isPlainListingView(data) ? introHtml : undefined,
  };
}

type LandingSeoCopy = {
  title: string;
  description: string;
};

/**
 * /v1 taxonomy resolve already fills these. Board 4.53.0 types only
 * introHtml; the extra optional strings still arrive on the object.
 */
type LandingPageContent = {
  introHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
};

function filledLandingCopy(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function landingDocument(
  resolution: LandingPageContent,
  data: JobsListingFiltersInput & { within?: number },
  fallback: LandingSeoCopy,
): LandingSeoCopy {
  if (!isPlainListingView(data)) return fallback;
  return {
    title: filledLandingCopy(resolution.metaTitle) ?? fallback.title,
    description:
      filledLandingCopy(resolution.metaDescription) ?? fallback.description,
  };
}

/** A resolution without its intro, for pages that never show one. */
function withoutIntro<T extends { introHtml?: string }>(resolution: T) {
  const { introHtml: _introHtml, ...rest } = resolution;
  return rest;
}

/**
 * A location combination's own jobs in the place (`within=0`), which its
 * default-distance view's noindex turns on, as the sitemap does: with none
 * in the place the listing shows only nearby jobs. Read (one row, total
 * only) only for the plain view of a widened place, and reused per place and
 * facet for a few minutes; `null` otherwise or when the read fails, which
 * keeps the page indexable.
 */
async function combinationInPlaceJobCount(
  data: JobsListingFiltersInput & { locationSlug: string; within?: number },
  facet: { category: string } | { skill: string },
  radiusKmRead: Promise<number | undefined>,
  headers: Record<string, string>,
): Promise<number | null> {
  if (!isPlainListingView(data)) return null;
  // Only a widened listing (a city or locality) has an in-place count to
  // compare against.
  if ((await radiusKmRead) === undefined) return null;
  const key = listingCacheKey(
    data.locationSlug,
    'category' in facet ? `category:${facet.category}` : `skill:${facet.skill}`,
  );
  const cached = combinationInPlaceCountCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const readAt = Date.now();
    const exact = await getBoard().jobs.list(
      { location: data.locationSlug, ...facet, offset: 0, limit: 1 },
      { headers },
    );
    const count = catalogJobCount(exact.count, exact.gatedCount);
    if (count === undefined) return null;
    combinationInPlaceCountCache.set(key, count, readAt);
    return count;
  } catch {
    return null;
  }
}

/**
 * On-site and hybrid jobs a suggested place's location page lists before it
 * is indexed (hosted `SUGGESTED_PLACE_INDEX_MIN_JOBS`). Remote jobs list on
 * the page but do not count toward it.
 */
const SUGGESTED_PLACE_INDEX_MIN_JOBS = 5;

/**
 * A suggested place's (`suggested` on its resolution) on-site and hybrid
 * jobs within its default distance, read in parallel with its listing once
 * the place resolves. `null` for any other place, for a view with a chosen
 * distance (`within`, always noindexed) and when the read fails.
 */
async function suggestedPlaceIndexJobCount(
  data: { locationSlug: string; within?: number },
  placeRead: Promise<TaxonomyResolution | null>,
  headers: Record<string, string>,
): Promise<number | null> {
  if (data.within !== undefined) return null;
  const place = await placeRead.catch(() => null);
  if (!place?.suggested || place.redirectTo) return null;
  try {
    const list = await getBoard().jobs.list(
      {
        location: data.locationSlug,
        remoteOption: ['on_site', 'hybrid'],
        offset: 0,
        limit: 1,
      },
      { headers },
    );
    return catalogJobCount(list.count, list.gatedCount) ?? null;
  } catch {
    return null;
  }
}

/**
 * The in-place count a combination's noindex reads: none when the place has
 * no jobs of its own in the board's place directory. A suggested place (any
 * settlement from `places.suggest`) is never in it, and its exact read
 * cannot say so: the API widens it to the place's default distance.
 */
function combinationNoindexCount(
  placeTree: { data: readonly Pick<PublicPlace, 'slug' | 'jobCount'>[] } | null,
  place: Pick<TaxonomyResolution, 'sourceSlug' | 'canonicalSlug' | 'suggested'>,
  inPlaceJobCount: number | null,
): number | null {
  return place.suggested || placeJobCount(placeTree?.data, place) === 0
    ? 0
    : inPlaceJobCount;
}

/** The board's job custom fields as "All filters" controls. */
async function jobCustomFilterFields() {
  const boardContext = await readBoardContext();
  const language = getLocale();
  return toCustomFilterFields(boardContext.customFields?.job, {
    field: (definition) => customFieldLabel(definition, language),
    option: (definition, option) =>
      customFieldOptionLabel(definition.key, option, language),
  });
}

/** Canonical /jobs listing — list or search + head (jobSearch headingJobs). */
export const getJobsIndexPage = createServerFn({ method: 'GET' })
  .validator(
    (input: JobsListingFiltersInput & { customFields?: CustomFieldSearch }) =>
      input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      // Custom-field parameters are checked against the live definitions
      // before they reach the API, so a stale URL never 400s. Only a URL
      // that carries them waits for the definitions; the context read is
      // memoized per isolate and shared with the SEO base.
      const fieldsRead = jobCustomFilterFields();
      const customFields = hasCustomFieldSearch(data.customFields)
        ? customFieldFiltersOrUndefined(
            resolveCustomFieldFilters(await fieldsRead, data.customFields),
          )
        : undefined;
      const [rawList, seo, customFilterFields] = await Promise.all([
        // `jobs.list` has no custom-field filter; search without a query
        // lists the same catalog with the clauses applied.
        readReachablePage(data.offset, data.limit, (offset) =>
          data.q || customFields
            ? board.jobs.search(
                {
                  query: data.q,
                  filters: {
                    remoteOption: filters.remoteOption,
                    employmentType: filters.employmentType,
                    customEmploymentType: filters.customEmploymentType,
                    seniority: filters.seniority,
                    customFields,
                  },
                  sort: filters.sort,
                  offset,
                  limit: filters.limit,
                } satisfies JobsSearchBody,
                undefined,
                { headers },
              )
            : // Card teaser is on `summary` — do not pull full HTML descriptions.
              board.jobs.list({ ...filters, offset }, { headers }),
        ),
        seoBase(),
        fieldsRead,
      ]);
      const page = rawList;
      const relatedSearches =
        'relatedSearches' in page ? page.relatedSearches : undefined;
      const heading = jobSearchCopy().headingJobs;
      const countedHeading: CountedHeading = (counted) =>
        m.jobSearch_resultsCount(counted);
      const head = listingHead({
        title: jobsIndexPageTitle({
          boardName: seo.boardName,
          language: seo.language,
          count: catalogJobCount(page.count, page.gatedCount),
        }),
        origin: seo.origin,
        path: localizePath('/jobs'),
        description: listingMetaDescription({
          heading: heading,
          countedHeading,
          boardName: seo.boardName,
          count: catalogJobCount(page.count, page.gatedCount),
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
      return {
        page,
        seo,
        relatedSearches,
        head,
        jsonLd,
        customFilterFields,
        reachableCount: reachableCountOf(page),
      };
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
      const [category, listResult, seo] = await Promise.all([
        resolveOrNull(
          board.taxonomy.categories.resolve(data.categorySlug, { headers }),
        ),
        settled(
          readReachablePage(data.offset, data.limit, (offset) =>
            board.jobs.list(
              { ...filters, offset, category: data.categorySlug },
              { headers },
            ),
          ),
        ),
        seoBase(),
      ]);
      if (!category) return { kind: 'not_found' as const };
      if (category.redirectTo) {
        return { kind: 'redirect' as const, to: category.redirectTo };
      }
      if (!listResult.ok) throw listResult.error;
      const list = listResult.value;
      const heading = m.categoryPage_jobsHeading({
        category: category.displayName,
      });
      const countedHeading: CountedHeading = (counted) =>
        m.categoryPage_jobsCountHeading({
          ...counted,
          category: category.displayName,
        });
      const headCopy = landingDocument(category, data, {
        title: listingPageTitle({
          heading: heading,
          countedHeading,
          boardName: seo.boardName,
          language: seo.language,
          count: catalogJobCount(list.count, list.gatedCount),
        }),
        description: listingMetaDescription({
          heading: heading,
          countedHeading,
          boardName: seo.boardName,
          count: catalogJobCount(list.count, list.gatedCount),
        }),
      });
      const head = listingHead({
        title: headCopy.title,
        origin: seo.origin,
        path: localizePath(jobsCategoryPath(data.categorySlug)),
        description: headCopy.description,
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
      const intro = landingIntro(category, data);
      return {
        kind: 'ok' as const,
        category: intro.resolution,
        introHtml: intro.introHtml,
        list,
        seo,
        relatedSearches: list.relatedSearches,
        head,
        jsonLd,
        reachableCount: reachableCountOf(list),
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
      const [skill, listResult, seo] = await Promise.all([
        resolveOrNull(
          board.taxonomy.skills.resolve(data.skillSlug, { headers }),
        ),
        settled(
          readReachablePage(data.offset, data.limit, (offset) =>
            board.jobs.list(
              { ...filters, offset, skill: data.skillSlug },
              { headers },
            ),
          ),
        ),
        seoBase(),
      ]);
      if (!skill) return { kind: 'not_found' as const };
      if (skill.redirectTo) {
        return { kind: 'redirect' as const, to: skill.redirectTo };
      }
      if (!listResult.ok) throw listResult.error;
      const list = listResult.value;
      const heading = m.skillPage_jobsHeading({ skill: skill.displayName });
      const countedHeading: CountedHeading = (counted) =>
        m.skillPage_jobsCountHeading({ ...counted, skill: skill.displayName });
      const head = listingHead({
        title: listingPageTitle({
          heading: heading,
          countedHeading,
          boardName: seo.boardName,
          language: seo.language,
          count: catalogJobCount(list.count, list.gatedCount),
        }),
        origin: seo.origin,
        path: localizePath(jobsSkillPath(data.skillSlug)),
        description: listingMetaDescription({
          heading: heading,
          countedHeading,
          boardName: seo.boardName,
          count: catalogJobCount(list.count, list.gatedCount),
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
        reachableCount: reachableCountOf(list),
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
    (
      input: JobsListingFiltersInput & {
        locationSlug: string;
        /** Search distance in the place's unit; see `@/board/search-radius`. */
        within?: number;
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const placeRead = resolveOrNull(
        board.taxonomy.places.resolve(data.locationSlug, { headers }),
      );
      // Reads that do not depend on the radius start now. Only a cold slug
      // waits on the place resolve for its radius, and it must not hold back
      // the SEO, breadcrumb and taxonomy reads as well.
      const seoRead = startedEarly(seoBase());
      // Breadcrumb enrichment only: the place directory carries the ancestor
      // chain; on failure the trail degrades to the place itself.
      const placeTreeRead = board.taxonomy.places
        .list(undefined, { headers })
        .catch(() => null);
      const radiusParams = await jobsRadiusParams(data.within, () =>
        listingRadiusKm(data.locationSlug, placeRead, data.within),
      );
      // Never rejects; only a suggested place reads it.
      const indexJobCountRead = suggestedPlaceIndexJobCount(
        data,
        placeRead,
        headers,
      );
      const [place, listResult, seo, placeTree] = await Promise.all([
        placeRead,
        settled(
          readReachablePage(data.offset, data.limit, (offset) =>
            data.q
              ? board.jobs.search(
                  {
                    query: data.q,
                    filters: {
                      location: data.locationSlug,
                      ...radiusParams,
                      remoteOption: filters.remoteOption,
                      employmentType: filters.employmentType,
                      customEmploymentType: filters.customEmploymentType,
                      seniority: filters.seniority,
                    },
                    sort: filters.sort,
                    offset,
                    limit: filters.limit,
                  } satisfies JobsSearchBody,
                  undefined,
                  { headers },
                )
              : board.jobs.list(
                  {
                    ...filters,
                    offset,
                    location: data.locationSlug,
                    ...radiusParams,
                  },
                  { headers },
                ),
          ),
        ),
        seoRead,
        placeTreeRead,
      ]);
      const indexJobCount = await indexJobCountRead;
      if (!place) return { kind: 'not_found' as const };
      if (place.redirectTo) {
        return { kind: 'redirect' as const, to: place.redirectTo };
      }
      if (!listResult.ok) throw listResult.error;
      const list = listResult.value;
      const relatedSearches =
        'relatedSearches' in list ? list.relatedSearches : undefined;
      const searchRadius = placeSearchRadius(
        place,
        data.within,
        place.defaultRadiusKm,
      );
      const heading = m.locationPage_jobsHeading({ place: place.displayName });
      const countedHeading: CountedHeading = (counted) =>
        m.locationPage_jobsCountHeading({
          ...counted,
          place: place.displayName,
        });
      // Hosted parity: Home > Jobs > country > … > current place (terminal).
      const crumbs = breadcrumbsCopy();
      const breadcrumbTrail = [
        { name: crumbs.home, href: BOARD_PATHS.home },
        { name: crumbs.jobs, href: BOARD_PATHS.jobs },
        ...toJobsLocationHierarchyCrumbs(placeTree?.data ?? [], place),
      ];
      const headCopy = landingDocument(place, data, {
        title: listingPageTitle({
          heading: heading,
          countedHeading,
          boardName: seo.boardName,
          language: seo.language,
          count: catalogJobCount(list.count, list.gatedCount),
        }),
        description: listingMetaDescription({
          heading: heading,
          countedHeading,
          boardName: seo.boardName,
          count: catalogJobCount(list.count, list.gatedCount),
        }),
      });
      const head = noindexFollow(
        listingHead({
          title: headCopy.title,
          origin: seo.origin,
          path: localizePath(`/jobs/locations/${data.locationSlug}`),
          description: headCopy.description,
        }),
        // A suggested place is indexed at its default distance with enough
        // on-site and hybrid jobs within it.
        place.suggested
          ? (indexJobCount ?? 0) < SUGGESTED_PLACE_INDEX_MIN_JOBS
          : isSearchRadiusViewNoindex(
              searchRadius,
              placeJobCount(placeTree?.data, place),
            ),
      );
      const jsonLd = asJsonObjects(
        [
          trailBreadcrumbJsonLd(breadcrumbTrail, seo.origin),
          ...listingJsonLd({
            origin: seo.origin,
            breadcrumbs: [],
            jobs: list.data,
          }),
        ].filter((entry) => entry !== null),
      );
      const intro = landingIntro(place, data);
      return {
        kind: 'ok' as const,
        place: intro.resolution,
        introHtml: intro.introHtml,
        list,
        seo,
        relatedSearches,
        searchRadius,
        head,
        jsonLd,
        reachableCount: reachableCountOf(list),
        breadcrumbTrail,
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
        /** Search distance in the place's unit; see `@/board/search-radius`. */
        within?: number;
      },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const filters = listFilters(data);
      const placeRead = resolveOrNull(
        board.taxonomy.places.resolve(data.locationSlug, { headers }),
      );
      const categoryRead = startedEarly(
        resolveOrNull(
          board.taxonomy.categories.resolve(data.categorySlug, { headers }),
        ),
      );
      // Reads that do not depend on the radius start now. Only a cold slug
      // waits on the place resolve for its radius, and it must not hold back
      // the SEO, breadcrumb and taxonomy reads as well.
      const seoRead = startedEarly(seoBase());
      // Breadcrumb enrichment only: the place directory carries the ancestor
      // chain; on failure the trail degrades to the place itself.
      const placeTreeRead = board.taxonomy.places
        .list(undefined, { headers })
        .catch(() => null);
      // The in-place count needs the kilometres (whether the place widens
      // at all); the job list does not wait for them (see jobsRadiusParams).
      const radiusKmRead = listingRadiusKm(
        data.locationSlug,
        placeRead,
        data.within,
      );
      // A filtered view may never await it; a failed place resolve already
      // fails the page through `placeRead`, so do not also leave a rejection
      // unobserved.
      radiusKmRead.catch(() => undefined);
      const radiusParams = await jobsRadiusParams(
        data.within,
        () => radiusKmRead,
      );
      const [place, category, listResult, seo, placeTree, inPlaceJobCount] =
        await Promise.all([
          placeRead,
          categoryRead,
          settled(
            readReachablePage(data.offset, data.limit, (offset) =>
              board.jobs.list(
                {
                  ...filters,
                  offset,
                  location: data.locationSlug,
                  ...radiusParams,
                  category: data.categorySlug,
                },
                { headers },
              ),
            ),
          ),
          seoRead,
          placeTreeRead,
          combinationInPlaceJobCount(
            data,
            { category: data.categorySlug },
            radiusKmRead,
            headers,
          ),
        ]);
      if (!place || !category) return { kind: 'not_found' as const };
      if (place.redirectTo || category.redirectTo) {
        return {
          kind: 'redirect' as const,
          locationTo: place.redirectTo ?? data.locationSlug,
          keywordTo: category.redirectTo ?? data.categorySlug,
        };
      }
      if (!listResult.ok) throw listResult.error;
      const list = listResult.value;
      const searchRadius = placeSearchRadius(
        place,
        data.within,
        place.defaultRadiusKm,
      );
      const heading = m.locationCategoryPage_jobsHeading({
        category: category.displayName,
        place: place.displayName,
      });
      const countedHeading: CountedHeading = (counted) =>
        m.locationCategoryPage_jobsCountHeading({
          ...counted,
          category: category.displayName,
          place: place.displayName,
        });
      // Hosted parity: Home > Jobs > country > … > place (linked) > category,
      // with facet-relaxation links — ancestors keep the category scope (same
      // jobs, wider area) while the current place links its bare listing.
      const crumbs = breadcrumbsCopy();
      const breadcrumbTrail = [
        { name: crumbs.home, href: BOARD_PATHS.home },
        { name: crumbs.jobs, href: BOARD_PATHS.jobs },
        ...toJobsLocationHierarchyCrumbs(placeTree?.data ?? [], place, {
          linkCurrent: true,
          ancestorPath: (slug) =>
            jobsLocationCategoryPath(slug, category.canonicalSlug),
        }),
        { name: category.displayName },
      ];
      const head = noindexFollow(
        listingHead({
          title: listingPageTitle({
            heading: heading,
            countedHeading,
            boardName: seo.boardName,
            language: seo.language,
            count: catalogJobCount(list.count, list.gatedCount),
          }),
          origin: seo.origin,
          path: localizePath(
            `/jobs/locations/${data.locationSlug}/${data.categorySlug}`,
          ),
          description: listingMetaDescription({
            heading: heading,
            countedHeading,
            boardName: seo.boardName,
            count: catalogJobCount(list.count, list.gatedCount),
          }),
        }),
        isSearchRadiusViewNoindex(
          searchRadius,
          combinationNoindexCount(placeTree, place, inPlaceJobCount),
        ),
      );
      const jsonLd = asJsonObjects(
        [
          trailBreadcrumbJsonLd(breadcrumbTrail, seo.origin),
          ...listingJsonLd({
            origin: seo.origin,
            breadcrumbs: [],
            jobs: list.data,
          }),
        ].filter((entry) => entry !== null),
      );
      return {
        kind: 'ok' as const,
        place: withoutIntro(place),
        category: withoutIntro(category),
        list,
        seo,
        relatedSearches: list.relatedSearches,
        searchRadius,
        head,
        jsonLd,
        reachableCount: reachableCountOf(list),
        breadcrumbTrail,
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
        /** Search distance in the place's unit; see `@/board/search-radius`. */
        within?: number;
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
      const placeRead = resolveOrNull(
        board.taxonomy.places.resolve(data.locationSlug, { headers }),
      );
      const skillRead = startedEarly(
        resolveOrNull(
          board.taxonomy.skills.resolve(data.skillSlug, { headers }),
        ),
      );
      // Reads that do not depend on the radius start now. Only a cold slug
      // waits on the place resolve for its radius, and it must not hold back
      // the SEO, breadcrumb and taxonomy reads as well.
      const seoRead = startedEarly(seoBase());
      // Breadcrumb enrichment only: the place directory carries the ancestor
      // chain; on failure the trail degrades to the place itself.
      const placeTreeRead = board.taxonomy.places
        .list(undefined, { headers })
        .catch(() => null);
      // The in-place count needs the kilometres (whether the place widens
      // at all); the job list does not wait for them (see jobsRadiusParams).
      const radiusKmRead = listingRadiusKm(
        data.locationSlug,
        placeRead,
        data.within,
      );
      // A filtered view may never await it; a failed place resolve already
      // fails the page through `placeRead`, so do not also leave a rejection
      // unobserved.
      radiusKmRead.catch(() => undefined);
      const radiusParams = await jobsRadiusParams(
        data.within,
        () => radiusKmRead,
      );
      const [place, skill, listResult, seo, placeTree, inPlaceJobCount] =
        await Promise.all([
          placeRead,
          skillRead,
          settled(
            readReachablePage(data.offset, data.limit, (offset) =>
              board.jobs.list(
                {
                  ...filters,
                  offset,
                  location: data.locationSlug,
                  ...radiusParams,
                  skill: data.skillSlug,
                },
                { headers },
              ),
            ),
          ),
          seoRead,
          placeTreeRead,
          combinationInPlaceJobCount(
            data,
            { skill: data.skillSlug },
            radiusKmRead,
            headers,
          ),
        ]);
      if (!place || !skill) return { kind: 'not_found' as const };
      if (place.redirectTo || skill.redirectTo) {
        return {
          kind: 'redirect' as const,
          locationTo: place.redirectTo ?? data.locationSlug,
          skillTo: skill.redirectTo ?? data.skillSlug,
        };
      }
      if (!listResult.ok) throw listResult.error;
      const list = listResult.value;
      const searchRadius = placeSearchRadius(
        place,
        data.within,
        place.defaultRadiusKm,
      );
      const heading = m.locationSkillPage_jobsHeading({
        skill: skill.displayName,
        place: place.displayName,
      });
      const countedHeading: CountedHeading = (counted) =>
        m.locationSkillPage_jobsCountHeading({
          ...counted,
          skill: skill.displayName,
          place: place.displayName,
        });
      // Hosted parity: Home > Jobs > country > … > place (linked) > skill,
      // with the same facet-relaxation trail — ancestors keep the skill
      // scope, the current place links its bare listing.
      const crumbs = breadcrumbsCopy();
      const breadcrumbTrail = [
        { name: crumbs.home, href: BOARD_PATHS.home },
        { name: crumbs.jobs, href: BOARD_PATHS.jobs },
        ...toJobsLocationHierarchyCrumbs(placeTree?.data ?? [], place, {
          linkCurrent: true,
          ancestorPath: (slug) =>
            jobsLocationSkillPath(slug, skill.canonicalSlug),
        }),
        { name: skill.displayName },
      ];
      const head = noindexFollow(
        listingHead({
          title: listingPageTitle({
            heading: heading,
            countedHeading,
            boardName: seo.boardName,
            language: seo.language,
            count: catalogJobCount(list.count, list.gatedCount),
          }),
          origin: seo.origin,
          path: localizePath(
            `/jobs/locations/${data.locationSlug}/skills/${data.skillSlug}`,
          ),
          description: listingMetaDescription({
            heading: heading,
            countedHeading,
            boardName: seo.boardName,
            count: catalogJobCount(list.count, list.gatedCount),
          }),
        }),
        isSearchRadiusViewNoindex(
          searchRadius,
          combinationNoindexCount(placeTree, place, inPlaceJobCount),
        ),
      );
      const jsonLd = asJsonObjects(
        [
          trailBreadcrumbJsonLd(breadcrumbTrail, seo.origin),
          ...listingJsonLd({
            origin: seo.origin,
            breadcrumbs: [],
            jobs: list.data,
          }),
        ].filter((entry) => entry !== null),
      );
      return {
        kind: 'ok' as const,
        place: withoutIntro(place),
        skill,
        list,
        seo,
        relatedSearches: list.relatedSearches,
        searchRadius,
        head,
        jsonLd,
        reachableCount: reachableCountOf(list),
        breadcrumbTrail,
      };
    }),
  );
