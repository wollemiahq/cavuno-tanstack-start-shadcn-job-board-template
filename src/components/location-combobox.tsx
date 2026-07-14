'use client';

import { useEffect, useState } from 'react';

import { MapPin, X } from 'lucide-react';

import { m } from '../paraglide/messages';

import type { LocationSuggestionVM } from '@/board/location-suggestion';
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { InputGroupAddon, InputGroupButton } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface LocationSuggestionState {
  suggestions: LocationSuggestionVM[];
  loading: boolean;
  onQueryChange: (query: string) => void;
}

interface LocationComboboxProps extends LocationSuggestionState {
  /** The active location slug from the URL (cold load), if any. */
  value?: string;
  /** Display name for the active slug when known (e.g. a /jobs/locations page). */
  valueLabel?: string;
  onSelect: (place: { slug: string; name: string }) => void;
  onClear: () => void;
  className?: string;
  inputClassName?: string;
}

/**
 * Location search field — the hosted board's `board-place-search-field`: type a
 * place name, pick from resolved `places.list({ q })` autocomplete suggestions,
 * and apply its slug as the jobs location filter.
 *
 * The route owns the debounced API request. This component composes the owned
 * shadcn Combobox and InputGroup primitives around that external async state.
 */
export function LocationCombobox({
  value,
  valueLabel,
  onSelect,
  onClear,
  suggestions,
  loading,
  onQueryChange,
  className,
  inputClassName,
}: LocationComboboxProps) {
  const [text, setText] = useState(valueLabel ?? value ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setText(valueLabel ?? value ?? '');
  }, [value, valueLabel]);

  const clear = () => {
    setText('');
    setOpen(false);
    onQueryChange('');
    onClear();
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
      inputValue={text}
      itemToStringLabel={(place: LocationSuggestionVM) => place.name}
      itemToStringValue={(place: LocationSuggestionVM) => place.slug}
      isItemEqualToValue={(place, selected) => place.id === selected.id}
      onInputValueChange={(nextText, details) => {
        setText(nextText);
        if (details.reason !== 'input-change') return;

        onQueryChange(nextText);
        if (value && nextText !== (valueLabel ?? value)) onClear();
        setOpen(Boolean(nextText.trim()));
      }}
      onValueChange={(place) => {
        if (!place) return;
        setText(place.name);
        setOpen(false);
        onSelect({ slug: place.slug, name: place.name });
      }}
    >
      <ComboboxInput
        type="text"
        aria-label={m.locationCombobox_locationAriaLabel()}
        placeholder={m.locationCombobox_placeholderText()}
        showTrigger={false}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        className={cn(
          'border-border bg-background w-full',
          className,
          inputClassName,
        )}
      >
        <InputGroupAddon>
          <MapPin aria-hidden="true" />
        </InputGroupAddon>
        {text || value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-xs"
              aria-label={m.locationCombobox_clearAriaLabel()}
              onClick={clear}
              className="text-muted-foreground"
            >
              <X aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </ComboboxInput>
      <ComboboxContent aria-busy={loading}>
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
