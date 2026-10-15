/**
 * Route-family-owned server boundary for talent directory + public profile.
 */
import {
  isNotFound,
  type CustomFieldFilter,
  type TalentDirectoryQuery,
  type TaxonomyResolution,
} from '@cavuno/board';
import { BOARD_PATHS, talentLocationPath } from '@cavuno/board/paths';
import {
  createBreadcrumbJsonLd,
  listingHead,
  listingJsonLd,
} from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { localizePath } from '../lib/localized-path';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';
import { listingRadiusKm } from './listing-place-cache';
import {
  noindexFollow,
  resolveOrNull,
  settled,
  trailJsonLd,
} from './place-listing-helpers';
import { profileCustomFilters } from './profile-filter-fields';
import { readTalentDirectory } from './talent-directory-read';

import { toPlaceHierarchyCrumbs } from '@/board/jobs-location-hierarchy';
import { placeLinkSlug } from '@/board/place-link';
import {
  isSearchRadiusViewNoindex,
  placeSearchRadius,
  shortPlaceName,
  type PlaceSearchRadius,
} from '@/board/search-radius';
import { TALENT_PLACES_LIMIT } from '@/board/talent-places';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import type { CustomFieldSearch } from '@/lib/custom-field-filters';
import {
  listingMetaDescription,
  listingPageTitle,
  type CountedHeading,
} from '@/lib/listing-description';
import { selfUrl } from '@/lib/self-url';
import { talentProfilePath } from '@/lib/talent-profile-path';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };
type ProfilePersonJsonLd = {
  '@type': 'Person';
  '@id': string;
  name?: string;
  jobTitle?: string;
  description?: string;
  homeLocation?: string;
  knowsAbout?: string[];
};

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: Structured data is composed from literal schema.org objects and
  // Board strings, then JSON round-tripped to erase readonly SDK helper types.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

/** The distance control for a `/talent` place search, when it can widen. */
export type TalentPlaceRadius = {
  /** The place's own name for the results line, e.g. `Houston`. */
  placeName: string;
  radius: PlaceSearchRadius;
};

function talentPlaceRadius(
  place: TaxonomyResolution | null,
  within: number | undefined,
): TalentPlaceRadius | null {
  if (!place) return null;
  const radius = placeSearchRadius(place, within);
  return radius ? { placeName: shortPlaceName(place), radius } : null;
}

async function seoBase() {
  // Same isolate memo as root/company/job pages — do not re-hit board.context().
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

/** The `/talent` directory filters, as the route's search params carry them. */
export type TalentDirectoryPageInput = {
  offset: number;
  limit: number;
  q?: string;
  skill?: string;
  jobSearchStatus?: 'actively_looking' | 'open_to_offers' | 'not_looking';
  languages?: string;
  openToRelocate?: 'true' | 'false';
  place?: string;
  /** Search distance in the place's unit; see `@/board/search-radius`. */
  within?: number;
  sort?: 'relevance' | 'newest';
  seniority?: string;
  permitCountry?: string;
  interestedRole?: string;
  customFields?: CustomFieldSearch;
};

/** One directory page's API query for `talent.list()`. */
function talentDirectoryQuery(
  data: TalentDirectoryPageInput,
  radius: number | undefined,
  customFields: CustomFieldFilter[] | undefined,
): TalentDirectoryQuery {
  return {
    offset: data.offset,
    q: data.q,
    skill: data.skill,
    limit: data.limit,
    jobSearchStatus: data.jobSearchStatus,
    languages: data.languages,
    openToRelocate: data.openToRelocate,
    place: data.place,
    radius,
    sort: data.sort,
    seniority: data.seniority,
    permitCountry: data.permitCountry,
    interestedRole: data.interestedRole,
    customFields,
  };
}

export const getTalentIndexPage = createServerFn({ method: 'GET' })
  .validator((input: TalentDirectoryPageInput) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const custom = await profileCustomFilters(
        'candidate',
        data.customFields,
        headers,
      );
      // A city or locality `place` widens to the distance control's radius,
      // as on location job listings. The place only shapes the radius and the
      // control, so a failed resolve lists the place as the API reads it.
      const placeRead: Promise<TaxonomyResolution | null> = data.place
        ? getBoard()
            .taxonomy.places.resolve(data.place, { headers })
            .catch(() => null)
        : Promise.resolve(null);
      const radius = data.place
        ? await listingRadiusKm(data.place, placeRead, data.within)
        : undefined;
      // The directory read does not depend on the SEO base, so it starts
      // first and is awaited below — these used to be two serial waves.
      const directory = readTalentDirectory(() =>
        getBoard().talent.list(
          talentDirectoryQuery(data, radius, custom.clauses),
          { headers },
        ),
      );
      const seo = await seoBase();
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.talentDirectory_title()),
          },
          {
            name: 'description',
            content: m.talentDirectory_metaDescription({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [{ rel: 'canonical', href: selfUrl(seo.origin, '/talent') }],
      };
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.talent },
          ]),
        ].filter((e) => e !== null),
      );

      try {
        const [result, customFilterFields, place] = await Promise.all([
          directory,
          custom.fields,
          placeRead,
        ]);
        if (result.status === 'restricted') {
          return {
            seo,
            page: null,
            restricted: true as const,
            head,
            jsonLd,
            customFilterFields: [],
            placeRadius: null,
            place,
          };
        }
        return {
          seo,
          page: result.page,
          restricted: false as const,
          head,
          jsonLd,
          customFilterFields,
          placeRadius: talentPlaceRadius(place, data.within),
          // The header location field labels `?place=` with its name.
          place,
        };
      } catch (error) {
        if (isNotFound(error)) throw error;
        throw error;
      }
    }),
  );

export const getTalentProfilePage = createServerFn({ method: 'GET' })
  .validator((input: { handle: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [profile, seo] = await Promise.all([
        getBoard().talent.retrieve(data.handle, { headers }),
        seoBase(),
      ]);
      const title =
        profile.displayName ?? m.publicProfile_profileFallbackLabel();
      // A profile without a handle is only reachable by its opaque id.
      const canonical = selfUrl(
        seo.origin,
        talentProfilePath(profile.handle ?? profile.id),
      );
      const head = {
        meta: [
          { title: headTitle(seo.boardName, title) },
          ...(profile.headline
            ? [{ name: 'description', content: profile.headline }]
            : []),
        ],
        links: [
          {
            rel: 'canonical',
            href: canonical,
          },
        ],
      };
      const displayName =
        profile.displayName ?? m.publicProfile_anonymousCandidateLabel();
      const c = breadcrumbsCopy();
      const person: ProfilePersonJsonLd = {
        '@type': 'Person',
        '@id': `${canonical}#person`,
      };
      if (profile.displayName) {
        person.name = profile.displayName;
      }
      if (profile.headline) {
        person.jobTitle = profile.headline;
      }
      if (profile.bio) {
        person.description = profile.bio;
      }
      if (profile.location) {
        person.homeLocation = profile.location;
      }
      if (profile.skills.length > 0) {
        person.knowsAbout = profile.skills.map((skill) => skill.name);
      }
      const jsonLd = asJsonObjects(
        [
          {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            url: canonical,
            mainEntity: person,
          },
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.talent, href: selfUrl(seo.origin, '/talent') },
            { label: displayName },
          ]),
        ].filter((e) => e !== null),
      );
      return { profile, seo, head, jsonLd };
    }),
  );

/**
 * /talent/locations — the places directory candidates live in, with head and
 * breadcrumbs. Follows the directory's access rules like `/talent`: Off
 * rejects with 404 (the route's not-found page), Employers only renders the
 * restricted gate. Indexing follows `/talent`: the page stays indexable.
 */
export const getTalentLocationsIndexPage = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (headers) => {
      const [result, seo] = await Promise.all([
        readTalentDirectory(() =>
          getBoard().talent.places.list(
            { limit: TALENT_PLACES_LIMIT },
            { headers },
          ),
        ),
        seoBase(),
      ]);
      const restricted = result.status === 'restricted';
      const heading = m.talentLocationsIndex_heading();
      const crumbs = breadcrumbsCopy();
      const breadcrumbTrail = [
        { name: crumbs.home, href: BOARD_PATHS.home },
        { name: crumbs.talent, href: BOARD_PATHS.talent },
        { name: crumbs.locations },
      ];
      const head = listingHead({
        title: listingPageTitle({
          heading,
          boardName: seo.boardName,
          language: seo.language,
        }),
        origin: seo.origin,
        path: localizePath(BOARD_PATHS.talentLocations),
        description: listingMetaDescription({
          heading,
          boardName: seo.boardName,
        }),
      });
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: trailJsonLd(breadcrumbTrail),
        }),
      );
      return {
        seo,
        places: result.status === 'available' ? result.page.data : [],
        restricted,
        head,
        jsonLd,
        breadcrumbTrail,
      };
    }),
  );

/**
 * /talent/locations/$location — the talent directory filtered to one place,
 * with head and breadcrumbs in ONE server fn, like `getJobsLocationPage`.
 *
 * The slug is canonicalised against the talent place directory, the list the
 * directory index, breadcrumbs and sitemap link from: a place listed under
 * its English `slug` 308s to its board-language link slug (`placeLinkSlug`).
 * `places.resolve` supplies only what the list lacks (the point and level
 * for the search distance, and the name of a place the list does not hold:
 * no visible candidates, or past its 500 places). Its `redirectTo` is not
 * followed: for some places and board languages its canonical slug differs
 * from the list's, and following it would bounce visitors off the slug the
 * rest of the board links, or loop. An unlisted place renders while it
 * resolves and 404s when it does not. A city or locality widens to the
 * search distance (`within`); the other directory filters apply as on
 * `/talent`.
 *
 * Trade-off (as on the jobs page): the reads run together, so a slug that
 * redirects still reads a directory page that is discarded.
 */
export const getTalentLocationPage = createServerFn({ method: 'GET' })
  .validator(
    (
      input: Omit<TalentDirectoryPageInput, 'place'> & { locationSlug: string },
    ) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const custom = await profileCustomFilters(
        'candidate',
        data.customFields,
        headers,
      );
      const placeRead = resolveOrNull(
        board.taxonomy.places.resolve(data.locationSlug, { headers }),
      );
      const radius = await listingRadiusKm(
        data.locationSlug,
        placeRead.catch(() => null),
        data.within,
      );
      const [resolved, listResult, seo, placeTree, customFilterFields] =
        await Promise.all([
          // The resolve only adds geo and a fallback name; a failure other
          // than an unknown slug must not take the page down when the list
          // knows the place.
          settled(placeRead),
          settled(
            readTalentDirectory(() =>
              board.talent.list(
                talentDirectoryQuery(
                  { ...data, place: data.locationSlug },
                  radius,
                  custom.clauses,
                ),
                { headers },
              ),
            ),
          ),
          seoBase(),
          // Read as the viewer, like the directory: a restricted directory
          // rejects it, and on failure the page falls back to the resolve.
          board.talent.places
            .list({ limit: TALENT_PLACES_LIMIT }, { headers })
            .catch(() => null),
          custom.fields,
        ]);
      // A board without a talent directory has no talent location pages,
      // whatever the slug.
      if (!listResult.ok && isNotFound(listResult.error)) {
        return { kind: 'not_found' as const };
      }
      const listed = placeTree?.data.find(
        (node) =>
          node.slug === data.locationSlug ||
          node.canonicalSlug === data.locationSlug,
      );
      const linkSlug = listed ? placeLinkSlug(listed) : null;
      if (linkSlug && linkSlug !== data.locationSlug) {
        return { kind: 'redirect' as const, to: linkSlug };
      }
      if (!resolved.ok && !listed) throw resolved.error;
      const resolution = resolved.ok ? resolved.value : null;
      if (!resolution && !listed) return { kind: 'not_found' as const };
      if (!listResult.ok) throw listResult.error;
      const result = listResult.value;
      const restricted = result.status === 'restricted';
      const page = result.status === 'available' ? result.page : null;
      const count = page ? (page.count ?? page.data.length) : undefined;
      // The resolution's board-language name, as on the jobs page; the
      // list's name for a place only the list knows.
      const displayName = resolution?.displayName ?? listed?.displayName ?? '';
      const place = { displayName };
      const heading = m.talentLocationPage_heading({ place: displayName });
      const countedHeading: CountedHeading = (counted) =>
        m.talentLocationPage_countHeading({ ...counted, place: displayName });
      // Home > Talent > country > … > current place (terminal), as on the
      // jobs location pages.
      const crumbs = breadcrumbsCopy();
      const breadcrumbTrail = [
        { name: crumbs.home, href: BOARD_PATHS.home },
        { name: crumbs.talent, href: BOARD_PATHS.talent },
        ...toPlaceHierarchyCrumbs(
          placeTree?.data ?? [],
          {
            sourceSlug:
              listed?.slug ?? resolution?.sourceSlug ?? data.locationSlug,
            canonicalSlug: data.locationSlug,
            displayName,
          },
          { placePath: talentLocationPath },
        ),
      ];
      // The place's own candidates, as the sitemap counts them: `0` when the
      // list does not hold it, unknown (indexable) when it could not be read.
      const inPlaceCount = placeTree ? (listed?.candidateCount ?? 0) : null;
      const head = noindexFollow(
        listingHead({
          title: listingPageTitle({
            heading,
            countedHeading,
            boardName: seo.boardName,
            language: seo.language,
            count,
          }),
          origin: seo.origin,
          path: localizePath(talentLocationPath(data.locationSlug)),
          description: listingMetaDescription({
            heading,
            countedHeading,
            boardName: seo.boardName,
            count,
          }),
        }),
        isSearchRadiusViewNoindex(
          placeSearchRadius(resolution, data.within),
          inPlaceCount,
        ),
      );
      const jsonLd = asJsonObjects(
        listingJsonLd({
          origin: seo.origin,
          breadcrumbs: trailJsonLd(breadcrumbTrail),
        }),
      );
      return {
        kind: 'ok' as const,
        seo,
        place,
        page,
        restricted,
        head,
        jsonLd,
        customFilterFields: restricted ? [] : customFilterFields,
        placeRadius: restricted
          ? null
          : talentPlaceRadius(resolution, data.within),
        breadcrumbTrail,
      };
    }),
  );
