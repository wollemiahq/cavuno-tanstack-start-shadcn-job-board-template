import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  createSettingsLoader,
  SettingsPageView,
  type SettingsSearch,
} from './-settings';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { headTitle } from '@/lib/page-title';
import {
  searchString,
  type UrlSearchInput,
  type UrlSearchValue,
} from '@/lib/pagination';

type Channel = SettingsSearch['channel'];
const rootApi = getRouteApi('__root__');

function asChannel(value: UrlSearchValue): Channel {
  return value === 'messageEmails' ||
    value === 'applicationEmails' ||
    value === 'recommendedJobEmails'
    ? value
    : undefined;
}

export const Route = createFileRoute('/settings')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  validateSearch: (search: UrlSearchInput): SettingsSearch => ({
    token: searchString(search.token),
    boardUserId: searchString(search.boardUserId),
    channel: asChannel(search.channel),
  }),
  loaderDeps: ({ search }) => search,
  loader: createSettingsLoader(),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.settings_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const data = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  return (
    <SettingsPageView
      data={data}
      jobRecommendationsEnabled={
        board.features.jobRecommendationsEnabled ?? true
      }
    />
  );
}
