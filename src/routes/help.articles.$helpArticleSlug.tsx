/**
 * `/help/articles/<slug>` — one help article, with its title and body in the
 * server HTML. An old slug redirects to the current one; an unknown slug is
 * the page's 404.
 */
import { formatDate } from '@cavuno/board/format';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getHelpArticlePage } from '../server/help-pages';
import { createHelpArticleLoader } from './-help-article-loader';

import { HelpArticlePage, HelpNotFound } from '@/components/board/help-center';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { jsonLdHeadScripts } from '@/components/json-ld';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/help/articles/$helpArticleSlug')({
  staticData: { fullBleed: true, ownsMain: true, headerSearchScope: 'help' },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  loader: createHelpArticleLoader(getHelpArticlePage),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: ArticlePage,
  notFoundComponent: () => (
    <HelpNotFound
      title={m.helpArticle_notFoundTitle()}
      description={m.help_notFoundDescription()}
      action={{ label: m.help_backLabel(), href: '/help' }}
    />
  ),
});

function ArticlePage() {
  const { article, moreInCategory } = Route.useLoaderData();
  const { board, contactEnabled } = rootApi.useLoaderData();
  const updated = formatDate(getLocale(), article.updatedAt);

  return (
    <HelpArticlePage
      article={article}
      moreInCategory={moreInCategory}
      updatedLabel={
        updated ? m.helpArticle_updatedText({ date: updated }) : null
      }
      contact={{
        boardName: board.name,
        contactPage: contactEnabled,
        email: board.footer.contactEmail,
      }}
    />
  );
}
