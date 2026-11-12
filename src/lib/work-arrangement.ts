/**
 * Work arrangement pages: the location slot of a jobs listing
 * (`/jobs/locations/<slug>` and its category and skill combinations) also
 * takes three reserved slugs, `remote`, `hybrid` and `on-site`. The Board API
 * lists such a page exactly as the matching `remoteOption` filter, so the
 * arrangement lives in the path instead of the query string wherever the
 * path can hold it. This module owns the slugs, their mapping to
 * `remoteOption` values and where a filter change or a direct URL lands.
 */
import { hasCustomFieldSearch } from '@/lib/custom-field-filters';
import type { RemoteOption } from '@cavuno/board';

const REMOTE_OPTION_BY_SLUG = {
  remote: 'remote',
  hybrid: 'hybrid',
  'on-site': 'on_site',
} as const satisfies Record<string, RemoteOption>;

export type WorkArrangementSlug = keyof typeof REMOTE_OPTION_BY_SLUG;

const SLUG_BY_REMOTE_OPTION = {
  remote: 'remote',
  hybrid: 'hybrid',
  on_site: 'on-site',
} as const satisfies Record<RemoteOption, WorkArrangementSlug>;

/**
 * The one arrangement whose page can be indexed (with enough jobs); the
 * sitemap lists no other.
 */
export const INDEXABLE_WORK_ARRANGEMENT: WorkArrangementSlug = 'remote';

export function isWorkArrangementSlug(
  slug: string | undefined,
): slug is WorkArrangementSlug {
  return slug !== undefined && Object.hasOwn(REMOTE_OPTION_BY_SLUG, slug);
}

/** The `remoteOption` filter value a work arrangement page lists. */
export function workArrangementRemoteOption(
  slug: WorkArrangementSlug,
): RemoteOption {
  return REMOTE_OPTION_BY_SLUG[slug];
}

/** The location slug of the page that lists a `remoteOption` value. */
export function workArrangementSlug(option: RemoteOption): WorkArrangementSlug {
  return SLUG_BY_REMOTE_OPTION[option];
}

/**
 * A listing search or filter set. `& object` lets one without an arrangement
 * pass the weak-type check while a present `remoteOption` must be valid.
 */
type ArrangementFilter = { remoteOption?: RemoteOption } & object;

/**
 * The listing a filter change starts from, by its route params: a category
 * (`/jobs/<category>`) or skill (`/jobs/skills/<skill>`) and the location
 * slot, which holds a place or a work arrangement. All empty is `/jobs`.
 */
export type JobsListingRoute = {
  location?: string;
  category?: string;
  skill?: string;
};

/** A typed TanStack destination: route template, its params and search. */
export type WorkArrangementTarget<Search> = { search: Search } & (
  | { to: '/jobs'; params?: undefined }
  | { to: '/jobs/$keyword'; params: { keyword: string } }
  | { to: '/jobs/skills/$skill'; params: { skill: string } }
  | { to: '/jobs/locations/$location'; params: { location: string } }
  | {
      to: '/jobs/locations/$location/$keyword';
      params: { location: string; keyword: string };
    }
  | {
      to: '/jobs/locations/$location/skills/$skill';
      params: { location: string; skill: string };
    }
);

function listingTarget<Search>(
  arrangement: WorkArrangementSlug | undefined,
  route: JobsListingRoute,
  search: Search,
): WorkArrangementTarget<Search> {
  if (route.category) {
    return arrangement
      ? {
          to: '/jobs/locations/$location/$keyword',
          params: { location: arrangement, keyword: route.category },
          search,
        }
      : { to: '/jobs/$keyword', params: { keyword: route.category }, search };
  }
  if (route.skill) {
    return arrangement
      ? {
          to: '/jobs/locations/$location/skills/$skill',
          params: { location: arrangement, skill: route.skill },
          search,
        }
      : { to: '/jobs/skills/$skill', params: { skill: route.skill }, search };
  }
  return arrangement
    ? {
        to: '/jobs/locations/$location',
        params: { location: arrangement },
        search,
      }
    : { to: '/jobs', search };
}

/**
 * Where a listing's search goes when its `remoteOption` belongs in the path:
 * the chosen arrangement's page (or, with none chosen on an arrangement
 * page, the listing without it), carrying the rest of the search. `null`
 * keeps the search on the current page: a real place holds the location
 * slot, so its arrangement stays `?remoteOption=`; nothing changes when no
 * arrangement is chosen off an arrangement page; and `/jobs` keeps it while
 * job custom-field filters are active, which only `/jobs` can hold.
 */
export function workArrangementTarget<Search extends ArrangementFilter>(
  route: JobsListingRoute,
  search: Search,
): WorkArrangementTarget<Omit<Search, 'remoteOption'>> | null {
  const onArrangement = isWorkArrangementSlug(route.location);
  if (route.location !== undefined && !onArrangement) return null;
  if (!onArrangement && !search.remoteOption) return null;
  if (!onArrangement && hasCustomFieldSearch(search)) return null;
  const { remoteOption, ...rest } = search;
  return listingTarget(
    remoteOption ? workArrangementSlug(remoteOption) : undefined,
    route,
    rest,
  );
}

/**
 * The redirect a listing URL that carries `remoteOption` needs, or `null`:
 * `/jobs?remoteOption=remote` opens `/jobs/locations/remote`, and an
 * arrangement page given another arrangement opens that one. The target
 * never carries `remoteOption`, so it cannot redirect again.
 */
export function workArrangementRedirect<Search extends ArrangementFilter>(
  route: JobsListingRoute,
  search: Search,
): WorkArrangementTarget<Omit<Search, 'remoteOption'>> | null {
  if (!search.remoteOption) return null;
  return workArrangementTarget(route, search);
}

/**
 * The filters a listing's controls show: on an arrangement page the
 * arrangement it lists, which the URL holds in its path.
 */
export function withWorkArrangementFilter<Filters extends ArrangementFilter>(
  location: string | undefined,
  filters: Filters,
): Filters {
  return isWorkArrangementSlug(location)
    ? { ...filters, remoteOption: workArrangementRemoteOption(location) }
    : filters;
}
