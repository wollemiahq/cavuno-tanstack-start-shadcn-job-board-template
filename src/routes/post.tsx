import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { PostJobPageView, createPostLoader } from './-post-route-support';
import { useLocationSuggestions } from './-use-location-suggestions';

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
  const officeLocationSuggestions = useLocationSuggestions(getLocale());

  return (
    <PostJobPageView
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
