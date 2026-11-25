import type { PublicHelpArticleSummary } from '@cavuno/board';

/** Case- and accent-insensitive form of a string, for matching. */
function searchable(text: string) {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

/**
 * The articles whose title or summary holds every word of the query, title
 * matches first; otherwise the operator's order. A query with no words
 * matches nothing. The help home uses this while the board's help search
 * cannot answer.
 */
export function searchHelpArticles(
  articles: PublicHelpArticleSummary[],
  query: string,
): PublicHelpArticleSummary[] {
  const terms = searchable(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const inTitle: PublicHelpArticleSummary[] = [];
  const inSummary: PublicHelpArticleSummary[] = [];
  for (const article of articles) {
    const title = searchable(article.title);
    if (terms.every((term) => title.includes(term))) {
      inTitle.push(article);
      continue;
    }
    const text = `${title} ${searchable(article.summary ?? '')}`;
    if (terms.every((term) => text.includes(term))) inSummary.push(article);
  }
  return [...inTitle, ...inSummary];
}
