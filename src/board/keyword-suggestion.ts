import type { PublicTaxonomyTerm } from '@cavuno/board';

export interface KeywordSuggestionVM {
  id: string;
  type: 'category' | 'skill';
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
