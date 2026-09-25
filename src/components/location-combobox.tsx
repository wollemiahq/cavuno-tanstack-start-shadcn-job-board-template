'use client';

import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';

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
  /** Called after the visitor picks a suggestion (ends a search session). */
  onPicked?: () => void;
}

/** Suggestions that can also resolve typed text the visitor never picked. */
export interface LocationSearchState extends LocationSuggestionState {
  /** The top place for `text`, or `null` when nothing matches. */
  resolve: (text: string) => Promise<LocationSuggestionVM | null>;
}

/** What a search submit should do about the location field. */
export type LocationPendingResolution =
  /** Nothing typed beyond the current place: search with it as-is. */
  | { kind: 'none' }
  /** Typed text resolved to its top place: search with this one. */
  | { kind: 'resolved'; place: { slug: string; name: string } }
  /** Typed text matches no place: the field says so; do not search. */
  | { kind: 'unmatched' };

export interface LocationComboboxHandle {
  /** Whether the field holds typed text that is not the current place. */
  hasPendingText: () => boolean;
  /**
   * Settle typed-but-unpicked text before a search runs, so a visitor who
   * types "Lond" and taps Search gets London rather than a dropped location.
   */
  resolvePending: () => Promise<LocationPendingResolution>;
}

interface LocationComboboxProps extends LocationSearchState {
  ref?: Ref<LocationComboboxHandle>;
  /** The active location slug from the URL (cold load), if any. */
  value?: string;
  /** Display name for the active slug when known (e.g. a /jobs/locations page). */
  valueLabel?: string;
  onSelect: (place: { slug: string; name: string }) => void;
  /**
   * Drop the resolved place. The caller MUST clear `value`/`valueLabel` in
   * response — this component treats the resulting `value → undefined` as the
   * echo of its own request and leaves the visitor's text alone. A caller that
   * ignores it will later swallow one genuine external clear.
   */
  onClear: () => void;
  className?: string;
  inputClassName?: string;
}

/**
 * Location search field — the hosted board's `board-place-search-field`: type a
 * place name, pick from resolved `places.list({ q })` autocomplete suggestions,
 * and apply its slug as the jobs location filter. Text typed but never picked
 * stays in the field; the host form calls `resolvePending()` on submit to
 * search with its top place, or to show that no place matches.
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
  resolve,
  className,
  inputClassName,
  ref,
}: LocationComboboxProps) {
  const [text, setText] = useState(valueLabel ?? value ?? '');
  const [open, setOpen] = useState(false);
  /** Typed text a search submit could not resolve to any place. */
  const [unmatched, setUnmatched] = useState<string | null>(null);
  const unmatchedId = useId();
  const anchorRef = useComboboxAnchor();
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * Set when THIS component asks the caller to drop its resolved place,
   * because the visitor edited the label. The resulting `value → undefined`
   * is then our own echo, not news, and must not overwrite what they typed.
   *
   * This relies on the `onClear` contract: a caller that never drops `value`
   * leaves the flag armed, and the next genuine external clear is swallowed.
   * The two are indistinguishable from in here — "value went away after I
   * asked for it" is all the component ever sees — so the contract is stated
   * on the prop rather than guessed at.
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

  const pendingText = () => {
    const typed = text.trim();
    if (!typed) return null;
    if (value && text === (valueLabel ?? value)) return null;
    return typed;
  };

  useImperativeHandle(ref, () => ({
    hasPendingText: () => pendingText() !== null,
    resolvePending: async () => {
      const typed = pendingText();
      if (typed === null) return { kind: 'none' };
      const place = await resolve(typed);
      if (!place) {
        setUnmatched(typed);
        setOpen(true);
        inputRef.current?.focus();
        return { kind: 'unmatched' };
      }
      setUnmatched(null);
      setText(place.name);
      return {
        kind: 'resolved',
        place: { slug: place.slug, name: place.name },
      };
    },
  }));

  const clear = () => {
    setUnmatched(null);
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
      open={
        open &&
        (unmatched !== null ||
          loading ||
          suggestions.length > 0 ||
          text.trim().length >= 2)
      }
      onOpenChange={(next, details) => {
        if (
          !next &&
          (loading || (text.trim().length >= 2 && suggestions.length === 0)) &&
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
        // Base UI blanks the input when the popup closes with nothing
        // picked. That erased what the visitor typed the moment they tapped
        // Search (or anywhere else), so the search ran without a location.
        // Keep the text; a submit resolves it instead.
        if (details.reason === 'input-clear') return;
        setText(nextText);
        if (details.reason !== 'input-change') return;

        setUnmatched(null);
        onQueryChange(nextText);
        if (value && nextText !== (valueLabel ?? value)) {
          invalidatedRef.current = true;
          onClear();
        }
        setOpen(Boolean(nextText.trim()));
      }}
      onValueChange={(place) => {
        if (!place) return;
        setUnmatched(null);
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
        aria-invalid={unmatched !== null || undefined}
        aria-describedby={unmatched !== null ? unmatchedId : undefined}
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
        {unmatched !== null ? (
          <p
            id={unmatchedId}
            role="alert"
            className="text-destructive px-3 py-2 text-sm"
          >
            {m.locationCombobox_noMatchText({ location: unmatched })}
          </p>
        ) : loading && suggestions.length === 0 ? (
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
