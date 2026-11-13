import { redirect } from '@tanstack/react-router';

import { followManagedRedirect, requestedPath } from './-catch-all-loader';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from './-programmatic-jobs-constants';

import {
  jobsListingLoaderDeps,
  type LocationJobsSearch,
} from '@/lib/jobs-search';
import { pageToOffset } from '@/lib/pagination';
import {
  getJobsCategoryPage,
  getJobsLocationCategoryPage,
  getJobsLocationPage,
  getJobsLocationSkillPage,
  getJobsSkillPage,
} from '@/server/jobs-listing-pages';
import { resolveRedirect } from '@/server/queries';

type JobsListingDeps = ReturnType<typeof jobsListingLoaderDeps>;
type LocationJobsListingDeps = Omit<LocationJobsSearch, 'selectedJob'>;

export function createJobsCategoryLoader(
  loadPage: typeof getJobsCategoryPage = getJobsCategoryPage,
  resolve: typeof resolveRedirect = resolveRedirect,
) {
  return async ({
    params,
    deps,
    location,
  }: {
    params: { keyword: string };
    deps: JobsListingDeps;
    location: { publicHref: string };
  }) => {
    const result = await loadPage({
      data: {
        categorySlug: params.keyword,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        customEmploymentType: deps.customEmploymentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found')
      return followManagedRedirect(resolve, requestedPath(location));
    if (result.kind === 'redirect') {
      throw redirect({
        to: '/jobs/$keyword',
        params: { keyword: result.to },
        statusCode: 308,
      });
    }
    return result;
  };
}

export function createJobsLocationCategoryLoader(
  loadPage: typeof getJobsLocationCategoryPage = getJobsLocationCategoryPage,
  resolve: typeof resolveRedirect = resolveRedirect,
) {
  return async ({
    params,
    deps,
    location,
  }: {
    params: { location: string; keyword: string };
    deps: LocationJobsListingDeps;
    location: { publicHref: string };
  }) => {
    const result = await loadPage({
      data: {
        locationSlug: params.location,
        categorySlug: params.keyword,
        within: deps.within,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        customEmploymentType: deps.customEmploymentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found')
      return followManagedRedirect(resolve, requestedPath(location));
    if (result.kind === 'redirect') {
      throw redirect({
        to: '/jobs/locations/$location/$keyword',
        params: { location: result.locationTo, keyword: result.keywordTo },
        statusCode: 308,
      });
    }
    return result;
  };
}

export function createJobsLocationLoader(
  loadPage: typeof getJobsLocationPage = getJobsLocationPage,
  resolve: typeof resolveRedirect = resolveRedirect,
) {
  return async ({
    params,
    deps,
    location,
  }: {
    params: { location: string };
    deps: LocationJobsListingDeps;
    location: { publicHref: string };
  }) => {
    const result = await loadPage({
      data: {
        locationSlug: params.location,
        within: deps.within,
        q: deps.q,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        customEmploymentType: deps.customEmploymentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found')
      return followManagedRedirect(resolve, requestedPath(location));
    if (result.kind === 'redirect') {
      throw redirect({
        to: '/jobs/locations/$location',
        params: { location: result.to },
        statusCode: 308,
      });
    }
    return result;
  };
}

export function createJobsLocationSkillLoader(
  loadPage: typeof getJobsLocationSkillPage = getJobsLocationSkillPage,
  resolve: typeof resolveRedirect = resolveRedirect,
) {
  return async ({
    params,
    deps,
    location,
  }: {
    params: { location: string; skill: string };
    deps: LocationJobsListingDeps;
    location: { publicHref: string };
  }) => {
    const result = await loadPage({
      data: {
        locationSlug: params.location,
        skillSlug: params.skill,
        within: deps.within,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        customEmploymentType: deps.customEmploymentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found')
      return followManagedRedirect(resolve, requestedPath(location));
    if (result.kind === 'redirect') {
      throw redirect({
        to: '/jobs/locations/$location/skills/$skill',
        params: { location: result.locationTo, skill: result.skillTo },
        statusCode: 308,
      });
    }
    return result;
  };
}

export function createJobsSkillLoader(
  loadPage: typeof getJobsSkillPage = getJobsSkillPage,
  resolve: typeof resolveRedirect = resolveRedirect,
) {
  return async ({
    params,
    deps,
    location,
  }: {
    params: { skill: string };
    deps: JobsListingDeps;
    location: { publicHref: string };
  }) => {
    const result = await loadPage({
      data: {
        skillSlug: params.skill,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        customEmploymentType: deps.customEmploymentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found')
      return followManagedRedirect(resolve, requestedPath(location));
    if (result.kind === 'redirect') {
      throw redirect({
        to: '/jobs/skills/$skill',
        params: { skill: result.to },
        statusCode: 308,
      });
    }
    return result;
  };
}
