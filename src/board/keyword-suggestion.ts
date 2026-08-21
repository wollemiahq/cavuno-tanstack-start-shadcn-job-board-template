import type { PublicTaxonomyTerm } from '@cavuno/board';

export interface KeywordSuggestionVM {
  id: string;
  type: 'category' | 'skill' | 'post' | 'tag';
  slug: string;
  name: string;
}

/** Map the localized Board taxonomy term to the keyword combobox contract. */
export function toKeywordSuggestionVM(
  term: PublicTaxonomyTerm,
): KeywordSuggestionVM {
  return {
    id: `${term.type}:${term.canonicalSlug}`,
    type: term.type,
    slug: term.canonicalSlug,
    name: term.displayName,
  };
}

/** 4.0.0 suggest items for the blog scope (ADR-0102 `post` / `tag` kinds). */
export interface BlogSuggestionItem {
  type: 'post' | 'tag';
  slug: string;
  /** Post title or tag display name, depending on `type`. */
  title?: string;
  name?: string;
}

/** Map a blog-scope suggest item to the shared keyword combobox contract. */
export function toBlogSuggestionVM(
  item: BlogSuggestionItem,
): KeywordSuggestionVM {
  return {
    id: `${item.type}:${item.slug}`,
    type: item.type,
    slug: item.slug,
    name: (item.type === 'post' ? item.title : item.name) ?? item.slug,
  };
}

/**
 * Posts first, then tags, each keeping the API's own relevance order within
 * its group. A visitor typing into the blog search is nearly always after an
 * article; a tag is a way to browse toward one. Ranking posts above tags puts
 * the thing they came for in the rows they actually look at.
 */
export function sortBlogSuggestions(
  suggestions: readonly KeywordSuggestionVM[],
): KeywordSuggestionVM[] {
  const rank = (suggestion: KeywordSuggestionVM) =>
    suggestion.type === 'post' ? 0 : 1;

  // Array#sort is stable, so relevance order survives inside each group.
  return [...suggestions].sort((a, b) => rank(a) - rank(b));
}
