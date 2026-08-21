'use client';

import { useRef, useState } from 'react';

import { Search, X } from 'lucide-react';

import { m } from '../paraglide/messages';

import type { KeywordSuggestionVM } from '@/board/keyword-suggestion';
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { InputGroupAddon, InputGroupButton } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface KeywordSuggestionState {
  suggestions: KeywordSuggestionVM[];
  loading: boolean;
  onQueryChange: (query: string) => void;
}

interface KeywordComboboxProps extends KeywordSuggestionState {
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  onSelect: (suggestion: KeywordSuggestionVM) => void;
  onClear: () => void;
  className?: string;
}

/** Jobs keyword autocomplete: canonical terms plus an unrestricted text value. */
export function KeywordCombobox({
  value,
  placeholder,
  suggestions,
  loading,
  onQueryChange,
  onValueChange,
  onSelect,
  onClear,
  className,
}: KeywordComboboxProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useComboboxAnchor();
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    setOpen(false);
    onQueryChange('');
    onValueChange('');
    onClear();
    inputRef.current?.focus();
  };

  return (
    <Combobox
      items={suggestions}
      filteredItems={suggestions}
      filter={null}
      autoComplete="none"
      autoHighlight
      open={open}
      onOpenChange={setOpen}
      inputValue={value}
      itemToStringLabel={(term: KeywordSuggestionVM) => term.name}
      itemToStringValue={(term: KeywordSuggestionVM) => term.id}
      isItemEqualToValue={(term, selected) => term.id === selected.id}
      onInputValueChange={(nextValue, details) => {
        if (details.reason !== 'input-change') return;

        onValueChange(nextValue);
        onQueryChange(nextValue);
        setOpen(Boolean(nextValue.trim()));
      }}
      onValueChange={(term) => {
        if (!term) return;
        setOpen(false);
        onSelect(term);
      }}
    >
      <ComboboxInput
        ref={inputRef}
        anchorRef={anchorRef}
        type="text"
        aria-label={m.searchBar_keywordAriaLabel()}
        placeholder={placeholder}
        showTrigger={false}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        className={cn(
          'border-border bg-input/50 h-9 w-full min-w-0 flex-1',
          className,
        )}
      >
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        {value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-xs"
              aria-label={m.searchBar_clearAriaLabel()}
              onClick={clear}
              className="text-muted-foreground"
            >
              <X aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </ComboboxInput>
      <ComboboxContent anchor={anchorRef} aria-busy={loading}>
        {loading && suggestions.length === 0 ? (
          <div
            role="status"
            className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm"
          >
            <Spinner />
            {m.locationCombobox_searchingText()}
          </div>
        ) : (
          <ComboboxList>
            {(term: KeywordSuggestionVM) => (
              <ComboboxItem key={term.id} value={term}>
                <span className="min-w-0 flex-1 truncate">{term.name}</span>
                {/* Only the blog scope earns a kind badge, because posts and
                    tags are genuinely different things sitting in one list.
                    The jobs scope drops it: category-vs-skill is an internal
                    taxonomy distinction that means nothing to a visitor, and
                    labelling every row with it was noise. */}
                {term.type === 'post' || term.type === 'tag' ? (
                  <span className="text-muted-foreground text-xs">
                    {term.type === 'post'
                      ? m.searchSuggestion_postBadge()
                      : m.searchSuggestion_tagBadge()}
                  </span>
                ) : null}
              </ComboboxItem>
            )}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
