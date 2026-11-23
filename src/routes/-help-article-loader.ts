import { redirect } from '@tanstack/react-router';

import type { getHelpArticlePage } from '../server/help-pages';

/**
 * The help article loader: a published article renders, and an old slug
 * answers 308 to the article's current slug before anything renders, so the
 * old URL never serves a second copy of the page.
 */
export function createHelpArticleLoader(loadPage: typeof getHelpArticlePage) {
  return async ({ params }: { params: { helpArticleSlug: string } }) => {
    const page = await loadPage({
      data: { helpArticleSlug: params.helpArticleSlug },
    });
    const { article } = page;
    const target =
      (article.redirected ? article.newSlug : null) ??
      (article.slug !== params.helpArticleSlug ? article.slug : null);
    if (target && target !== params.helpArticleSlug) {
      throw redirect({
        to: '/help/articles/$helpArticleSlug',
        params: { helpArticleSlug: target },
        statusCode: 308,
      });
    }
    return page;
  };
}
