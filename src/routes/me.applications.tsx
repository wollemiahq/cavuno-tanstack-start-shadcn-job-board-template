/**
 * `/me/applications` — the signed-in candidate's applications, over
 * `board.me.applications.*` (list / withdraw). Status is the coarse,
 * Himalayas-grounded candidate view (applied → interviewing → … → archived).
 */
import { createFileRoute, useRouter } from '@tanstack/react-router';

import { ApplicationsPageView } from './-me.applications';
import {
  applicationsHead,
  createApplicationsLoader,
} from './-me.applications-loader';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';

export const Route = createFileRoute('/me/applications')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: createApplicationsLoader(),
  head: ({ loaderData }) => applicationsHead(loaderData),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const applications = Route.useLoaderData();
  const router = useRouter();
  return (
    <ApplicationsPageView
      applications={applications}
      invalidate={async () => {
        await router.invalidate();
      }}
    />
  );
}
