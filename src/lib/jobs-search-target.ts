import type {
  HeaderSearchLocation,
  HeaderSearchTerm,
} from '@/lib/header-search';
import type { ListingFilters } from '@cavuno/board/filters';

export type JobsSearchFilters = Pick<
  ListingFilters,
  'remoteOption' | 'employmentType' | 'seniority'
>;

export interface ResolveJobsSearchTargetInput {
  query: string | undefined;
  location: HeaderSearchLocation | null;
  term: HeaderSearchTerm | null;
  filters?: JobsSearchFilters;
}

/**
 * Jobs-scope destination for header search and the embed Search button.
 *
 * Every `/jobs…` listing route parses its search with `parseListingFilters`,
 * so a filter only survives the trip if it is in that FILTER vocabulary —
 * which is narrower than the wire vocabulary for `employmentType`
 * (`volunteer` and `other` exist on the wire and are dropped here). Callers
 * are responsible for not staging a filter the destination cannot honour;
 * this function forwards what it is given.
 */
export type JobsSearchTarget =
  | {
      to: '/jobs/locations/$location/skills/$skill';
      params: { location: string; skill: string };
      search?: JobsSearchFilters;
    }
  | {
      to: '/jobs/locations/$location/$keyword';
      params: { location: string; keyword: string };
      search?: JobsSearchFilters;
    }
  | {
      to: '/jobs/skills/$skill';
      params: { skill: string };
      search?: JobsSearchFilters;
    }
  | {
      to: '/jobs/$keyword';
      params: { keyword: string };
      search?: JobsSearchFilters;
    }
  | {
      to: '/jobs/locations/$location';
      params: { location: string };
      search: { q: string | undefined } & JobsSearchFilters;
    }
  | {
      to: '/jobs';
      search: { q: string | undefined } & JobsSearchFilters;
    };

function compactFilters(filters?: JobsSearchFilters): JobsSearchFilters {
  if (!filters) return {};
  return {
    ...(filters.remoteOption ? { remoteOption: filters.remoteOption } : {}),
    ...(filters.employmentType
      ? { employmentType: filters.employmentType }
      : {}),
    ...(filters.seniority?.length ? { seniority: filters.seniority } : {}),
  };
}

function withFilters<T extends object>(
  target: T,
  extra: JobsSearchFilters,
): T & { search: JobsSearchFilters } {
  return { ...target, search: extra };
}

/**
 * Resolve the jobs listing (or programmatic jobs page) a keyword / location /
 * taxonomy term should open. The site header `navigate()`s this object; the
 * embed header spreads it onto a `Link` with `target="_blank"`, so the iframe
 * never navigates.
 */
export function resolveJobsSearchTarget({
  query,
  location,
  term,
  filters,
}: ResolveJobsSearchTargetInput): JobsSearchTarget {
  const extra = compactFilters(filters);
  const hasFilters = Object.keys(extra).length > 0;
  const jobsTerm =
    term?.type === 'skill' || term?.type === 'category' ? term : null;

  if (location && jobsTerm?.type === 'skill') {
    const target = {
      to: '/jobs/locations/$location/skills/$skill' as const,
      params: { location: location.slug, skill: jobsTerm.slug },
    };
    return hasFilters ? withFilters(target, extra) : target;
  }

  if (location && jobsTerm?.type === 'category') {
    const target = {
      to: '/jobs/locations/$location/$keyword' as const,
      params: { location: location.slug, keyword: jobsTerm.slug },
    };
    return hasFilters ? withFilters(target, extra) : target;
  }

  if (jobsTerm?.type === 'skill') {
    const target = {
      to: '/jobs/skills/$skill' as const,
      params: { skill: jobsTerm.slug },
    };
    return hasFilters ? withFilters(target, extra) : target;
  }

  if (jobsTerm?.type === 'category') {
    const target = {
      to: '/jobs/$keyword' as const,
      params: { keyword: jobsTerm.slug },
    };
    return hasFilters ? withFilters(target, extra) : target;
  }

  if (location) {
    return {
      to: '/jobs/locations/$location',
      params: { location: location.slug },
      search: { q: query, ...extra },
    };
  }

  return { to: '/jobs', search: { q: query, ...extra } };
}
