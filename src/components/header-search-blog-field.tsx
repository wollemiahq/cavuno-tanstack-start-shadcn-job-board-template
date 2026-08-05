'use client';

import type { HeaderSearchProps } from '@/components/Header';
import { KeywordCombobox } from '@/components/keyword-combobox';
import type { HeaderSearchTerm } from '@/lib/header-search';

/** Blog-scope search field: post/tag typeahead over the unified suggest
 * endpoint (ADR-0102), falling back to free-text search on submit. */
export function HeaderSearchBlogField({
  search,
  value,
  placeholder,
  onValueChange,
  onTermChange,
}: {
  search: HeaderSearchProps['search'];
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  onTermChange: (term: HeaderSearchTerm | null) => void;
}) {
  return (
    <KeywordCombobox
      {...search.blogSuggestions}
      value={value}
      placeholder={placeholder}
      onValueChange={(nextValue) => {
        onValueChange(nextValue);
        onTermChange(null);
      }}
      onSelect={(suggestion) => {
        onValueChange(suggestion.name);
        onTermChange(suggestion);
        // Selecting a post/tag IS the navigation intent — go there now,
        // no second Enter required (jobs scope differs: its term combines
        // with a location before submit).
        search.onSubmit({
          scope: search.scope,
          query: suggestion.name,
          location: null,
          term: suggestion,
          market: null,
        });
      }}
      onClear={() => onTermChange(null)}
    />
  );
}
