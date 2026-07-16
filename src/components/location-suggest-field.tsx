'use client';

import { useRef, useState } from 'react';

import { MapPin } from 'lucide-react';

import type { LocationSuggestionVM } from '@/board/location-suggestion';
import type { LocationSuggestionState } from '@/components/location-combobox';
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { InputGroupAddon } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * Free-text location field with board place suggestions — the profile-form
 * variant of `LocationCombobox`. Profile locations are free strings on the
 * API, so unlike the jobs filter (which only commits a resolved place slug)
 * every keystroke IS the value; picking a suggestion just replaces it with
 * the resolved place name. The route owns the debounced suggestion request
 * and passes the `LocationSuggestionState` down.
 */
export function LocationSuggestField({
  id,
  value,
  onValueChange,
  suggestions,
  loading,
  onQueryChange,
  placeholder,
  searchingText,
  className,
}: LocationSuggestionState & {
  id: string;
  value: string;
  onValueChange: (text: string) => void;
  placeholder?: string;
  searchingText: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useComboboxAnchor();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Combobox
      items={suggestions}
      filteredItems={suggestions}
      filter={null}
      autoComplete="none"
      open={open && suggestions.length > 0}
      onOpenChange={setOpen}
      inputValue={value}
      itemToStringLabel={(place: LocationSuggestionVM) => place.name}
      itemToStringValue={(place: LocationSuggestionVM) => place.slug}
      isItemEqualToValue={(place, selected) => place.id === selected.id}
      onInputValueChange={(nextText, details) => {
        if (details.reason !== 'input-change') return;
        onValueChange(nextText);
        onQueryChange(nextText);
        setOpen(Boolean(nextText.trim()));
      }}
      onValueChange={(place) => {
        if (!place) return;
        onValueChange(place.name);
        setOpen(false);
      }}
    >
      <ComboboxInput
        ref={inputRef}
        id={id}
        anchorRef={anchorRef}
        type="text"
        placeholder={placeholder}
        showTrigger={false}
        onFocus={() => {
          if (suggestions.length > 0 && value.trim()) setOpen(true);
        }}
        className={cn('w-full', className)}
      >
        <InputGroupAddon>
          <MapPin aria-hidden="true" />
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent anchor={anchorRef} aria-busy={loading}>
        {loading && suggestions.length === 0 ? (
          <div
            role="status"
            className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm"
          >
            <Spinner />
            {searchingText}
          </div>
        ) : (
          <ComboboxList>
            {(place: LocationSuggestionVM) => (
              <ComboboxItem key={place.id} value={place}>
                <span className="shrink-0 truncate">{place.name}</span>
                {place.contextLabel ? (
                  <span className="text-muted-foreground truncate text-xs">
                    · {place.contextLabel}
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
