import type { PublicTaxonomyTerm } from '@cavuno/board';

export interface KeywordSuggestionVM {
  id: string;
  type: 'category' | 'skill' | 'post' | 'tag';
  slug: string;
  name: string;
}

/**
 * Map the localized Board taxonomy term to the keyword combobox contract.
 *
 * Typed to the fields this actually reads rather than the whole
 * `PublicTaxonomyTerm`: taxonomy collections carry a live `jobCount` that the
 * suggest endpoint's terms do not, and the combobox wants neither.
 */
export function toKeywordSuggestionVM(
  term: Pick<PublicTaxonomyTerm, 'type' | 'canonicalSlug' | 'displayName'>,
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

/**
 * Collapse category/skill rows that share a display name down to one.
 *
 * The API can return both kinds of the same term — "Robotics" exists as a
 * category AND a skill — and they route to different pages
 * (`/jobs/$keyword` vs `/jobs/skills/$skill`). Rendered without a kind badge
 * those rows are byte-identical, so a visitor picking one has no way to
 * predict where they land. One row, one destination.
 *
 * The category wins: `/jobs/$keyword` is the broader page, so it is the safer
 * answer for someone who did not express a preference. Position and the API's
 * relevance order are preserved — the survivor keeps the losing row's slot if
 * it came later.
 */
export function dedupeKeywordSuggestions(
  suggestions: readonly KeywordSuggestionVM[],
): KeywordSuggestionVM[] {
  const byName = new Map<string, KeywordSuggestionVM>();

  for (const suggestion of suggestions) {
    const key = suggestion.name.trim().toLowerCase();
    const kept = byName.get(key);

    // Map preserves first-insertion order even when the value is replaced,
    // so promoting the category does not move the row.
    if (!kept || (kept.type !== 'category' && suggestion.type === 'category')) {
      byName.set(key, suggestion);
    }
  }

  return [...byName.values()];
}
