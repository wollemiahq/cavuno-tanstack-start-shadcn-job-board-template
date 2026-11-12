import {
  pickCustomFieldSearch,
  type CustomFieldSearch,
} from '@/lib/custom-field-filters';
import type {
  HeaderSearchLocation,
  HeaderSearchTerm,
} from '@/lib/header-search';
import {
  parseJobsIndexSearch,
  parseJobsSearch,
  type JobsFilters,
} from '@/lib/jobs-search';
import type { UrlSearchInput } from '@/lib/pagination';
import { withWorkArrangementFilter } from '@/lib/work-arrangement';

export type JobsSearchFilters = Pick<
  JobsFilters,
  'remoteOption' | 'employmentType' | 'customEmploymentType' | 'seniority'
>;

export interface ResolveJobsSearchTargetInput {
  query: string | undefined;
  location: HeaderSearchLocation | null;
  term: HeaderSearchTerm | null;
  /** `cf.*` entries only apply to the plain `/jobs` target. */
  filters?: JobsSearchFilters & CustomFieldSearch;
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
      to: '/companies/$companySlug/jobs';
      params: { companySlug: string };
      search: { location?: string; locationName?: string };
    }
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
      search: { q: string | undefined } & JobsSearchFilters & CustomFieldSearch;
    };

/**
 * The filters a site header search keeps from the jobs listing the visitor
 * is on, so a new keyword or place does not silently drop the workplace,
 * type and seniority they picked. Only `/jobs` itself holds job custom-field
 * (`cf.*`) filters. Off a jobs listing nothing carries over. A work
 * arrangement page's arrangement carries over as the workplace filter.
 */
export function jobsFiltersFromHeader(
  pathname: string,
  current: UrlSearchInput,
): JobsSearchFilters & CustomFieldSearch {
  const path = pathname.replace(/\/+$/, '');
  if (path === '/jobs') {
    const search = parseJobsIndexSearch(current);
    return { ...compactFilters(search), ...pickCustomFieldSearch(search) };
  }
  if (path.startsWith('/jobs/')) {
    // A work arrangement page holds its arrangement in the path.
    const location = path.match(/^\/jobs\/locations\/([^/]+)/)?.[1];
    return compactFilters(
      withWorkArrangementFilter(location, parseJobsSearch(current)),
    );
  }
  return {};
}

function compactFilters(filters?: JobsSearchFilters): JobsSearchFilters {
  if (!filters) return {};
  const compact: JobsSearchFilters = {};
  if (filters.remoteOption) compact.remoteOption = filters.remoteOption;
  if (filters.employmentType) compact.employmentType = filters.employmentType;
  if (filters.customEmploymentType) {
    compact.customEmploymentType = filters.customEmploymentType;
  }
  if (filters.seniority?.length) compact.seniority = filters.seniority;
  return compact;
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
  // A picked company opens that company's jobs. The /jobs listing has no
  // company filter, and listing filters other than location do not apply.
  if (term?.type === 'company') {
    return {
      to: '/companies/$companySlug/jobs',
      params: { companySlug: term.slug },
      search: location
        ? { location: location.slug, locationName: location.name }
        : {},
    };
  }

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

  return {
    to: '/jobs',
    search: { q: query, ...extra, ...pickCustomFieldSearch(filters ?? {}) },
  };
}
