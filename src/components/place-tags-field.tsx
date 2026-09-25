'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

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
 * suggest input whose options the route owns (worldwide location search for
 * office locations, a static list for remote permits). Only a picked
 * suggestion becomes a tag — typed text is a query, never a value, so every
 * tag is a real place. Enter picks the highlighted suggestion or does
 * nothing; it never submits the host form.
 */
export function PlaceTagsField({
  id,
  tags,
  onAddSuggestion,
  onRemove,
  suggestions,
  loading,
  onQueryChange,
  onPicked,
  resolvePick,
  error,
  placeholder,
  searchingText,
  removeAriaLabel,
  className,
  icon = <MapPin aria-hidden="true" />,
  disabled = false,
}: LocationSuggestionState & {
  id: string;
  tags: PlaceTag[];
  onAddSuggestion: (place: LocationSuggestionVM) => void;
  onRemove: (key: string) => void;
  placeholder?: string;
  searchingText: string;
  /** Accessible label for a tag's remove control; `{label}` interpolated by caller. */
  removeAriaLabel: (label: string) => string;
  className?: string;
  /** Leading input icon; a map pin by default (the field began as a place picker). */
  icon?: ReactNode;
  /** Disables adding (a capped picker at its limit); tags stay removable. */
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const anchorRef = useComboboxAnchor();
  const pickGeneration = useRef(0);
  useEffect(
    () => () => {
      pickGeneration.current += 1;
    },
    [],
  );

  const available = suggestions.filter(
    (place) => !tags.some((tag) => tag.key === place.id),
  );

  const commitSuggestion = (place: LocationSuggestionVM) => {
    onAddSuggestion(place);
    onPicked?.();
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
              className="h-6 gap-0.5 pe-0.5"
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
        open={
          open && (loading || available.length > 0 || text.trim().length >= 2)
        }
        onOpenChange={(next, details) => {
          // Base UI closes an empty list (`none` / `cancel-open` /
          // `input-change`). Two characters already queued a places
          // request, so treating that close as final hid the spinner and
          // the results that arrived a moment later.
          if (
            !next &&
            (loading || (text.trim().length >= 2 && available.length === 0)) &&
            (details.reason === 'none' ||
              details.reason === 'cancel-open' ||
              details.reason === 'input-change')
          ) {
            return;
          }
          setOpen(next);
        }}
        inputValue={text}
        itemToStringLabel={(place: LocationSuggestionVM) => place.name}
        itemToStringValue={(place: LocationSuggestionVM) => place.slug}
        isItemEqualToValue={(place, selected) => place.id === selected.id}
        onInputValueChange={(nextText, details) => {
          if (details.reason !== 'input-change') return;
          pickGeneration.current += 1;
          setText(nextText);
          onQueryChange(nextText);
          setOpen(Boolean(nextText.trim()));
        }}
        onValueChange={(place) => {
          if (!place) return;
          if (!resolvePick) {
            commitSuggestion(place);
            return;
          }
          const current = ++pickGeneration.current;
          void resolvePick(place).then((resolved) => {
            if (resolved && current === pickGeneration.current)
              commitSuggestion(resolved);
          });
        }}
      >
        <ComboboxInput
          id={id}
          anchorRef={anchorRef}
          type="text"
          placeholder={placeholder}
          showTrigger={false}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-lookup-error` : undefined}
          onKeyDown={(event) => {
            // Enter inside this field must never submit the host form. With
            // suggestions open Base UI commits the highlighted place on the
            // same event; with none there is nothing to add.
            if (event.key === 'Enter') event.preventDefault();
          }}
          onFocus={() => {
            // Static option sets (the permit picker) list on refocus; async
            // search fields have no suggestions until a query, so stay shut.
            // First-time opening is Base UI's own click/ArrowDown behavior.
            if (available.length > 0) setOpen(true);
          }}
          className="w-full"
        >
          {icon ? <InputGroupAddon>{icon}</InputGroupAddon> : null}
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
      {error ? (
        <p
          id={`${id}-lookup-error`}
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
