import { getRouteApi } from "@tanstack/react-router";

const rootApi = getRouteApi("__root__");

export function useCandidateShellContext() {
  const { board, user } = rootApi.useLoaderData();

  return {
    candidatePaywall: board.features.candidatePaywall,
    viewer: user,
  };
}
