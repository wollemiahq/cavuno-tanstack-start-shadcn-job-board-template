'use client';

import { useRef, useState } from 'react';

import { Search, X } from 'lucide-react';

import { m } from '../paraglide/messages';

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

export interface CompanyMarketSuggestion {
  slug: string;
  name: string;
}

export interface CompanyMarketSuggestionState {
  suggestions: CompanyMarketSuggestion[];
  loading: boolean;
  onQueryChange: (query: string) => void;
}

interface CompanySearchComboboxProps extends CompanyMarketSuggestionState {
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  onSelect: (suggestion: CompanyMarketSuggestion) => void;
  onClear: () => void;
  className?: string;
}

/** One unrestricted Companies search with canonical market suggestions. */
export function CompanySearchCombobox({
  value,
  placeholder,
  suggestions,
  loading,
  onQueryChange,
  onValueChange,
  onSelect,
  onClear,
  className,
}: CompanySearchComboboxProps) {
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
      itemToStringLabel={(market: CompanyMarketSuggestion) => market.name}
      itemToStringValue={(market: CompanyMarketSuggestion) => market.slug}
      isItemEqualToValue={(market, selected) => market.slug === selected.slug}
      onInputValueChange={(nextValue, details) => {
        if (details.reason !== 'input-change') return;

        onValueChange(nextValue);
        onQueryChange(nextValue);
        setOpen(Boolean(nextValue.trim()));
      }}
      onValueChange={(market) => {
        if (!market) return;
        setOpen(false);
        onSelect(market);
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
            {(market: CompanyMarketSuggestion) => (
              <ComboboxItem key={market.slug} value={market}>
                {/* No kind badge: every row in this list is a market, so the
                    label repeated the obvious on every line. */}
                <span className="min-w-0 flex-1 truncate">{market.name}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
