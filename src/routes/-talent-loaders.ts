import { isNotFound } from '@cavuno/board';
import { notFound, redirect } from '@tanstack/react-router';

import { customFieldRequestSearch } from '@/lib/custom-field-filters';
import { pageToOffset } from '@/lib/pagination';
import { talentListingLoaderDeps } from '@/lib/talent-search';
import {
  getTalentIndexPage,
  getTalentLocationPage,
  getTalentLocationsIndexPage,
  getTalentProfilePage,
} from '@/server/talent-pages';

export type TalentProfileRouteDependencies = {
  getTalentProfilePage: typeof getTalentProfilePage;
};

type TalentProfileLoaderRequest = { handle: string; companyId?: string };

const profileDependencies: TalentProfileRouteDependencies = {
  getTalentProfilePage,
};

export function createTalentProfileLoader(
  dependencies: TalentProfileRouteDependencies = profileDependencies,
) {
  return async ({
    params,
    deps,
  }: {
    params: { handle: string };
    deps?: { companyId?: string };
  }) => {
    try {
      const data: TalentProfileLoaderRequest = {
        handle: params.handle,
      };
      if (deps?.companyId) data.companyId = deps.companyId;
      return await dependencies.getTalentProfilePage({ data });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  };
}

export const TALENT_PAGE_SIZE = 24;

export type TalentDirectoryRouteDependencies = {
  getTalentIndexPage: typeof getTalentIndexPage;
};

const directoryDependencies: TalentDirectoryRouteDependencies = {
  getTalentIndexPage,
};

export function createTalentDirectoryLoader(
  dependencies: TalentDirectoryRouteDependencies = directoryDependencies,
) {
  return async ({
    deps,
  }: {
    deps: ReturnType<typeof talentListingLoaderDeps>;
  }) => {
    try {
      return await dependencies.getTalentIndexPage({
        data: {
          offset: pageToOffset(deps.page ?? 1, TALENT_PAGE_SIZE),
          q: deps.q,
          skill: deps.skill,
          jobSearchStatus: deps.jobSearchStatus,
          languages: deps.languages,
          openToRelocate: deps.openToRelocate,
          place: deps.place,
          within: deps.within,
          sort: deps.sort,
          seniority: deps.seniority,
          permitCountry: deps.permitCountry,
          interestedRole: deps.interestedRole,
          customFields: customFieldRequestSearch(deps),
          limit: TALENT_PAGE_SIZE,
        },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  };
}

/**
 * `/talent/locations` — the directory of places candidates live in. Off 404s
 * like `/talent`; Employers only renders the restricted gate.
 */
export function createTalentLocationsIndexLoader(
  loadPage: typeof getTalentLocationsIndexPage = getTalentLocationsIndexPage,
) {
  return async () => {
    try {
      return await loadPage();
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  };
}

type TalentLocationDeps = Omit<
  ReturnType<typeof talentListingLoaderDeps>,
  'place'
>;

/**
 * `/talent/locations/$location` — the directory filtered to one place. An
 * inbound alias slug 308s to its canonical slug, as on
 * `/jobs/locations/$location`.
 */
export function createTalentLocationLoader(
  loadPage: typeof getTalentLocationPage = getTalentLocationPage,
) {
  return async ({
    params,
    deps,
  }: {
    params: { location: string };
    deps: TalentLocationDeps;
  }) => {
    const result = await loadPage({
      data: {
        locationSlug: params.location,
        offset: pageToOffset(deps.page ?? 1, TALENT_PAGE_SIZE),
        q: deps.q,
        skill: deps.skill,
        jobSearchStatus: deps.jobSearchStatus,
        languages: deps.languages,
        openToRelocate: deps.openToRelocate,
        within: deps.within,
        sort: deps.sort,
        seniority: deps.seniority,
        permitCountry: deps.permitCountry,
        interestedRole: deps.interestedRole,
        customFields: customFieldRequestSearch(deps),
        limit: TALENT_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found') throw notFound();
    if (result.kind === 'redirect') {
      throw redirect({
        to: '/talent/locations/$location',
        params: { location: result.to },
        statusCode: 308,
      });
    }
    return result;
  };
}
