/**
 * `/help` — the board's help center: every category with its first articles,
 * or the results of a search from the header's field (`/help?q=…`). A board
 * with nothing published has no help center, so the page is a 404 and the
 * footer link is hidden.
 */
import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getHelpHomePage } from '../server/help-pages';

import { HelpHomePage, HelpNotFound } from '@/components/board/help-center';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { searchQueryString, type UrlSearchInput } from '@/lib/pagination';

const rootApi = getRouteApi('__root__');

interface HelpSearch {
  q?: string;
}

/**
 * Route-contract features this site supports. `helpCategoryIcons`: the help
 * home shows the icon each help category carries, so the dashboard offers
 * the icon field on a category. Remove it if the help pages stop showing
 * `category.icon`.
 */
export const cavunoFeatures = ['helpCategoryIcons'] as const;

export const Route = createFileRoute('/help/')({
  staticData: { fullBleed: true, ownsMain: true, headerSearchScope: 'help' },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: UrlSearchInput): HelpSearch => ({
    q: searchQueryString(search.q),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getHelpHomePage({ data: { q: deps.q } }),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: HelpPage,
  notFoundComponent: () => (
    <HelpNotFound
      title={m.notFound_heading()}
      description={m.notFound_body()}
      action={{ label: m.notFound_browseJobsLink(), href: '/' }}
    />
  ),
});

function HelpPage() {
  const { groups, hasMoreArticles, search } = Route.useLoaderData();
  const { board, contactEnabled } = rootApi.useLoaderData();
  return (
    <HelpHomePage
      boardName={board.name}
      groups={groups}
      hasMoreArticles={hasMoreArticles}
      search={search}
      contact={{
        boardName: board.name,
        contactPage: contactEnabled,
        email: board.footer.contactEmail,
      }}
    />
  );
}
