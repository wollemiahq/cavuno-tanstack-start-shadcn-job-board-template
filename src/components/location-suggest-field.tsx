'use client';

import { useState, type Ref } from 'react';

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
 * Single location field over worldwide location suggestions — the profile
 * and experience variant of `LocationCombobox`. The API stores these
 * locations as plain strings, but only a picked suggestion is a real place:
 * `onValueChange` reports typing (the text is not a value yet) and `onPick`
 * reports the place whose `fullName` becomes the value. The host form
 * blocks a save while typed text is unpicked. The route owns the debounced
 * suggestion request and passes the `LocationSuggestionState` down.
 */
export function LocationSuggestField({
  id,
  value,
  onValueChange,
  onPick,
  suggestions,
  loading,
  onQueryChange,
  onPicked,
  placeholder,
  searchingText,
  invalid = false,
  describedBy,
  inputRef,
  className,
}: LocationSuggestionState & {
  id: string;
  value: string;
  /** Typed text — a query until a suggestion is picked. */
  onValueChange: (text: string) => void;
  onPick: (place: LocationSuggestionVM) => void;
  placeholder?: string;
  searchingText: string;
  /** Marks the input invalid (typed text left unpicked). */
  invalid?: boolean;
  /** Id of the host's error message for the input. */
  describedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useComboboxAnchor();

  return (
    <Combobox
      items={suggestions}
      filteredItems={suggestions}
      filter={null}
      autoComplete="none"
      open={
        open && (loading || suggestions.length > 0 || value.trim().length >= 2)
      }
      onOpenChange={(next, details) => {
        if (
          !next &&
          (loading || (value.trim().length >= 2 && suggestions.length === 0)) &&
          (details.reason === 'none' ||
            details.reason === 'cancel-open' ||
            details.reason === 'input-change')
        ) {
          return;
        }
        setOpen(next);
      }}
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
        onPick(place);
        onPicked?.();
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
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
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
                <span className="min-w-0 truncate">{place.name}</span>
                {place.contextLabel ? (
                  <span className="text-muted-foreground ms-auto shrink-0 ps-3 text-sm">
                    {place.contextLabel}
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
