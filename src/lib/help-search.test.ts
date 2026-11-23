import { describe, expect, it } from 'vitest';

import { searchHelpArticles } from './help-search';

import type { PublicHelpArticleSummary } from '@cavuno/board';

const category = { id: 'cat-billing', slug: 'billing', title: 'Billing' };

function article(
  slug: string,
  title: string,
  summary: string | null = null,
): PublicHelpArticleSummary {
  return {
    id: slug,
    object: 'public_help_article',
    slug,
    title,
    summary,
    category,
    publishedAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
  };
}

const articles = [
  article('teammates', 'Zeta', 'Who pays the Résumé fee'),
  article('closing', 'Omega'),
  article('fees', 'Resume fee explained'),
];

const slugs = (query: string) =>
  searchHelpArticles(articles, query).map((found) => found.slug);

describe('searchHelpArticles', () => {
  it('finds the articles holding every word, title matches first, whatever the case or accents', () => {
    // The summary match comes first in the board's order; the title match
    // still leads the results. "Omega" holds neither word.
    expect(slugs('FEE resume')).toEqual(['fees', 'teammates']);
  });

  it('does not match an article that holds only some of the words', () => {
    expect(slugs('resume omega')).toEqual([]);
  });

  it('matches nothing for a query with no words', () => {
    expect(slugs('   ')).toEqual([]);
  });
});
