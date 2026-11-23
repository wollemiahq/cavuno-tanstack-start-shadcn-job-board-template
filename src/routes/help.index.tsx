/**
 * `/help` — the board's help center: every category with its articles. A
 * board with nothing published has no help center, so the page is a 404 and
 * the footer link is hidden.
 */
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getHelpHomePage } from '../server/help-pages';

import { HelpHomePage, HelpNotFound } from '@/components/board/help-center';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { jsonLdHeadScripts } from '@/components/json-ld';

export const Route = createFileRoute('/help/')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  loader: () => getHelpHomePage(),
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
  const { groups, hasMoreArticles } = Route.useLoaderData();
  return (
    <HelpHomePage
      title={m.help_title()}
      description={m.help_subtitleText()}
      groups={groups}
      hasMoreArticles={hasMoreArticles}
      viewAllLabel={m.help_viewAllLabel()}
    />
  );
}
