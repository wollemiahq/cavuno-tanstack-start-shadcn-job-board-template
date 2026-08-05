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
