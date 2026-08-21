'use client';

import { useEffect, useRef, useState } from 'react';

import { MapPin, X } from 'lucide-react';

import { m } from '../paraglide/messages';

import type { LocationSuggestionVM } from '@/board/location-suggestion';
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
  const anchorRef = useComboboxAnchor();
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * Set when THIS component asks the caller to drop its resolved place,
   * because the visitor edited the label. The resulting `value → undefined`
   * is then our own echo, not news, and must not overwrite what they typed.
   */
  const invalidatedRef = useRef(false);

  useEffect(() => {
    const resolved = valueLabel ?? value;

    if (resolved) {
      invalidatedRef.current = false;
      setText(resolved);
      return;
    }

    // Cleared. Blank the field only when the clear came from OUTSIDE — a
    // history navigation or a programmatic reset, which are real news about
    // what the field should say. Swallow our own echo exactly once.
    if (invalidatedRef.current) {
      invalidatedRef.current = false;
      return;
    }

    setText('');
  }, [value, valueLabel]);

  const clear = () => {
    setText('');
    setOpen(false);
    onQueryChange('');
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
      inputValue={text}
      itemToStringLabel={(place: LocationSuggestionVM) => place.name}
      itemToStringValue={(place: LocationSuggestionVM) => place.slug}
      isItemEqualToValue={(place, selected) => place.id === selected.id}
      onInputValueChange={(nextText, details) => {
        setText(nextText);
        if (details.reason !== 'input-change') return;

        onQueryChange(nextText);
        if (value && nextText !== (valueLabel ?? value)) {
          invalidatedRef.current = true;
          onClear();
        }
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
        ref={inputRef}
        anchorRef={anchorRef}
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
