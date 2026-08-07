import { getRouteApi } from '@tanstack/react-router';

import { useRootSession } from '@/components/root-session';

const rootApi = getRouteApi('__root__');

export function useCandidateShellContext() {
  const { board } = rootApi.useLoaderData();
  const { user } = useRootSession();

  return {
    candidatePaywall: board.features.candidatePaywall,
    viewer: user,
  };
}
