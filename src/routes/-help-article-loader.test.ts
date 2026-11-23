import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import { createHelpArticleLoader } from './-help-article-loader';

import type { getHelpArticlePage } from '../server/help-pages';

type HelpArticlePage = Awaited<ReturnType<typeof getHelpArticlePage>>;

function pageFor(article: {
  slug: string;
  redirected: boolean;
  newSlug: string | null;
}): HelpArticlePage {
  return {
    article: {
      id: 'help_article_1',
      object: 'public_help_article',
      title: 'How to apply',
      summary: null,
      category: { id: 'help_category_1', slug: 'applying', title: 'Applying' },
      publishedAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-02T00:00:00.000Z',
      html: '<p>Body</p>',
      ...article,
    },
    head: { meta: [], links: [] },
    jsonLd: [],
    breadcrumbTrail: [],
  };
}

function loaderFor(page: HelpArticlePage) {
  const loadPage = vi.fn<typeof getHelpArticlePage>().mockResolvedValue(page);
  return { load: createHelpArticleLoader(loadPage), loadPage };
}

describe('help article loader', () => {
  it('renders the article at its current slug', async () => {
    const page = pageFor({
      slug: 'how-to-apply',
      redirected: false,
      newSlug: null,
    });
    const { load, loadPage } = loaderFor(page);

    await expect(
      load({ params: { helpArticleSlug: 'how-to-apply' } }),
    ).resolves.toBe(page);
    expect(loadPage).toHaveBeenCalledWith({
      data: { helpArticleSlug: 'how-to-apply' },
    });
  });

  it('308s an old slug to the current one before rendering', async () => {
    const { load } = loaderFor(
      pageFor({
        slug: 'how-to-apply',
        redirected: true,
        newSlug: 'how-to-apply',
      }),
    );

    const result = load({ params: { helpArticleSlug: 'applying-for-jobs' } });

    await expect(result).rejects.toSatisfy(isRedirect);
    await expect(result).rejects.toMatchObject({
      options: {
        to: '/help/articles/$helpArticleSlug',
        params: { helpArticleSlug: 'how-to-apply' },
        statusCode: 308,
      },
    });
  });
});
