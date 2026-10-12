/**
 * Route-family-owned server boundary for talent directory + public profile.
 */
import {
  isNotFound,
  type TalentDirectoryQuery,
  type TaxonomyResolution,
} from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';
import { listingRadiusKm } from './listing-place-cache';
import { profileCustomFilters } from './profile-filter-fields';
import { readTalentDirectory } from './talent-directory-read';

import {
  placeSearchRadius,
  shortPlaceName,
  type PlaceSearchRadius,
} from '@/board/search-radius';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import type { CustomFieldSearch } from '@/lib/custom-field-filters';
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

export const getTalentIndexPage = createServerFn({ method: 'GET' })
  .validator(
    (input: {
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
    }) => input,
  )
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
      const directory = readTalentDirectory(() => {
        const query = {
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
          customFields: custom.clauses,
        } satisfies TalentDirectoryQuery;
        return getBoard().talent.list(query, { headers });
      });
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
