'use client';

import { useState } from 'react';

import { MapPin, X } from 'lucide-react';

import type { LocationSuggestionVM } from '@/board/location-suggestion';
import type { LocationSuggestionState } from '@/components/location-combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export type PlaceTag = { key: string; label: string };

/**
 * Multi-place picker: committed places render as removable tags over one
 * board place-suggest input (the SDK `places.list({ q })` autocomplete the
 * route owns via `useLocationSuggestions`). Suggestion picks commit resolved
 * places; when the caller passes `onAddFreeText`, pressing Enter on
 * unresolved text commits it verbatim (the job-posting payload accepts
 * display-name-only office locations). Enter never submits the host form.
 */
export function PlaceTagsField({
  id,
  tags,
  onAddSuggestion,
  onAddFreeText,
  onRemove,
  suggestions,
  loading,
  onQueryChange,
  placeholder,
  searchingText,
  removeAriaLabel,
  className,
}: LocationSuggestionState & {
  id: string;
  tags: PlaceTag[];
  onAddSuggestion: (place: LocationSuggestionVM) => void;
  /** Enables committing unresolved text on Enter. */
  onAddFreeText?: (text: string) => void;
  onRemove: (key: string) => void;
  placeholder?: string;
  searchingText: string;
  /** Accessible label for a tag's remove control; `{label}` interpolated by caller. */
  removeAriaLabel: (label: string) => string;
  className?: string;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const anchorRef = useComboboxAnchor();

  const available = suggestions.filter(
    (place) => !tags.some((tag) => tag.key === place.id),
  );

  const commitSuggestion = (place: LocationSuggestionVM) => {
    onAddSuggestion(place);
    setText('');
    onQueryChange('');
    setOpen(false);
  };

  const commitFreeText = () => {
    const value = text.trim();
    if (!value || !onAddFreeText) return;
    onAddFreeText(value);
    setText('');
    onQueryChange('');
    setOpen(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.key}
              variant="secondary"
              render={<li />}
              className="h-6 gap-0.5 pr-0.5"
            >
              {tag.label}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={removeAriaLabel(tag.label)}
                className="text-muted-foreground hover:text-foreground size-5 rounded-full"
                onClick={() => onRemove(tag.key)}
              >
                <X className="size-3.5" />
              </Button>
            </Badge>
          ))}
        </ul>
      ) : null}
      <Combobox
        items={available}
        filteredItems={available}
        filter={null}
        autoComplete="none"
        autoHighlight
        open={open && available.length > 0}
        onOpenChange={setOpen}
        inputValue={text}
        itemToStringLabel={(place: LocationSuggestionVM) => place.name}
        itemToStringValue={(place: LocationSuggestionVM) => place.slug}
        isItemEqualToValue={(place, selected) => place.id === selected.id}
        onInputValueChange={(nextText, details) => {
          if (details.reason !== 'input-change') return;
          setText(nextText);
          onQueryChange(nextText);
          setOpen(Boolean(nextText.trim()));
        }}
        onValueChange={(place) => {
          if (!place) return;
          commitSuggestion(place);
        }}
      >
        <ComboboxInput
          id={id}
          anchorRef={anchorRef}
          type="text"
          placeholder={placeholder}
          showTrigger={false}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            // Enter inside this field must never submit the host form; with
            // suggestions open Base UI commits the highlighted place on the
            // same event, otherwise commit the raw text when allowed.
            event.preventDefault();
            if (open && available.length > 0) return;
            commitFreeText();
          }}
          onFocus={() => {
            // Static option sets (the permit picker) list on focus; async
            // search fields have no suggestions until a query, so stay shut.
            if (available.length > 0) setOpen(true);
          }}
          className="w-full"
        >
          <InputGroupAddon>
            <MapPin aria-hidden="true" />
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent anchor={anchorRef} aria-busy={loading}>
          {loading && available.length === 0 ? (
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
    </div>
  );
}
