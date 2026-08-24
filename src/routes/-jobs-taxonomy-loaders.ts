import { notFound, redirect } from '@tanstack/react-router';

import { PROGRAMMATIC_JOBS_PAGE_SIZE } from './-programmatic-jobs-constants';

import { jobsListingLoaderDeps } from '@/lib/jobs-search';
import { pageToOffset } from '@/lib/pagination';
import {
  getJobsCategoryPage,
  getJobsLocationCategoryPage,
  getJobsLocationPage,
  getJobsLocationSkillPage,
  getJobsSkillPage,
} from '@/server/jobs-listing-pages';

type JobsListingDeps = ReturnType<typeof jobsListingLoaderDeps>;

export function createJobsCategoryLoader(
  loadPage: typeof getJobsCategoryPage = getJobsCategoryPage,
) {
  return async ({
    params,
    deps,
  }: {
    params: { keyword: string };
    deps: JobsListingDeps;
  }) => {
    const result = await loadPage({
      data: {
        categorySlug: params.keyword,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found') throw notFound();
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
) {
  return async ({
    params,
    deps,
  }: {
    params: { location: string; keyword: string };
    deps: JobsListingDeps;
  }) => {
    const result = await loadPage({
      data: {
        locationSlug: params.location,
        categorySlug: params.keyword,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found') throw notFound();
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
) {
  return async ({
    params,
    deps,
  }: {
    params: { location: string };
    deps: JobsListingDeps;
  }) => {
    const result = await loadPage({
      data: {
        locationSlug: params.location,
        q: deps.q,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found') throw notFound();
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
) {
  return async ({
    params,
    deps,
  }: {
    params: { location: string; skill: string };
    deps: JobsListingDeps;
  }) => {
    const result = await loadPage({
      data: {
        locationSlug: params.location,
        skillSlug: params.skill,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found') throw notFound();
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
) {
  return async ({
    params,
    deps,
  }: {
    params: { skill: string };
    deps: JobsListingDeps;
  }) => {
    const result = await loadPage({
      data: {
        skillSlug: params.skill,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found') throw notFound();
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
