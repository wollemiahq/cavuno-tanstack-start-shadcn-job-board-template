import { Navigate, createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { PostJobPageView, createPostLoader } from './-post-route-support';
import { useLocationSuggestions } from './-use-location-suggestions';

import { MembershipPostGate } from '@/components/board/membership-post-gate';
import { useRootSession } from '@/components/root-session';
import { Spinner } from '@/components/ui/spinner';
import { employerPostDestination } from '@/lib/employer-post-destination';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

const rootApi = getRouteApi('__root__');
type PostSearch = { plan?: string };

export const Route = createFileRoute('/post')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): PostSearch => ({
    plan: searchString(search.plan)?.trim() || undefined,
  }),
  head: ({ loaderData }) => ({
    meta: [{ title: headTitle(loaderData?.seo.boardName, m.postJob_title()) }],
  }),
  loader: createPostLoader(),
  component: PostJobPage,
});

function PostJobPage() {
  const { plans, remotePermits } = Route.useLoaderData();
  const search = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const { user, ready, employerCompanies } = useRootSession();
  const officeLocationSuggestions = useLocationSuggestions(getLocale());
  const signedIn = ready && user !== null;
  const handoff = employerPostDestination(
    signedIn ? user : null,
    employerCompanies,
  );
  if (handoff.kind === 'company') {
    return (
      <Navigate
        to="/employers/companies/$slug/jobs/new"
        params={{ slug: handoff.slug }}
        replace
      />
    );
  }
  if (handoff.kind === 'dashboard') {
    return <Navigate to="/employers/dashboard" replace />;
  }
  // Safe anonymously: the board says up front whether posting is members-only,
  // so the gate stands in for the form instead of the wizard collecting a
  // submission the API will refuse. Signed-in managers with a company never
  // reach this — they post from the employer form above.
  const gate =
    handoff.kind === 'pending' ? (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    ) : board.posting?.requiresMembership ? (
      <MembershipPostGate
        boardName={board.name}
        contactEmail={board.footer.contactEmail}
        signedIn={signedIn}
      />
    ) : undefined;

  return (
    <PostJobPageView
      gate={gate}
      plans={plans}
      remotePermits={remotePermits}
      initialPlanId={search.plan}
      customFields={board.customFields.job}
      jobForm={board}
      locale={getLocale()}
      officeLocationSuggestions={officeLocationSuggestions}
    />
  );
}
