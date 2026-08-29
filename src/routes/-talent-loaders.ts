import { isNotFound } from '@cavuno/board';
import { notFound } from '@tanstack/react-router';

import { pageToOffset } from '@/lib/pagination';
import { talentListingLoaderDeps } from '@/lib/talent-search';
import {
  getTalentIndexPage,
  getTalentProfilePage,
} from '@/server/talent-pages';

export type TalentProfileRouteDependencies = {
  getTalentProfilePage: typeof getTalentProfilePage;
};

const profileDependencies: TalentProfileRouteDependencies = {
  getTalentProfilePage,
};

export function createTalentProfileLoader(
  dependencies: TalentProfileRouteDependencies = profileDependencies,
) {
  return async ({ params }: { params: { handle: string } }) => {
    try {
      return await dependencies.getTalentProfilePage({
        data: { handle: params.handle },
      });
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
          sort: deps.sort,
          seniority: deps.seniority,
          permitCountry: deps.permitCountry,
          interestedRole: deps.interestedRole,
          limit: TALENT_PAGE_SIZE,
        },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  };
}
