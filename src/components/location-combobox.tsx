"use client";

import { useEffect, useId, useRef, useState } from "react";

import { LoaderCircle, MapPin, X } from "lucide-react";

import type { LocationSuggestionVM } from "@/board/location-suggestion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { m } from "../paraglide/messages";

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
}

/**
 * Location search field — the hosted board's `board-place-search-field`: type a
 * place name, pick from debounced `places.list({ q })` autocomplete suggestions
 * (each with its live job count). Selecting one applies the place slug as the
 * jobs filter (server defaults the radius to 50 km).
 *
 * Built from the starter's owned shadcn Input and Button with Lucide icons.
 * The route owns the debounced API request and passes resolved suggestions;
 * this component owns only popup interaction and the selected display value.
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
}: LocationComboboxProps) {
  const [text, setText] = useState(valueLabel ?? value ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const popupVisible = open && (loading || suggestions.length > 0);

  useEffect(() => {
    setText(valueLabel ?? value ?? "");
  }, [value, valueLabel]);

  useEffect(() => setActive(0), [suggestions]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (place: LocationSuggestionVM) => {
    setText(place.name);
    setOpen(false);
    onSelect({ slug: place.slug, name: place.name });
  };

  const clear = () => {
    setText("");
    setOpen(false);
    onQueryChange("");
    onClear();
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <div className="relative flex w-full items-center">
        <MapPin className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={popupVisible}
          aria-controls={listboxId}
          aria-activedescendant={
            popupVisible && suggestions[active] ? `${listboxId}-option-${active}` : undefined
          }
          aria-label={m.locationCombobox_locationAriaLabel()}
          placeholder={m.locationCombobox_placeholderText()}
          value={text}
          onChange={(event) => {
            const nextText = event.target.value;
            setText(nextText);
            onQueryChange(nextText);
            if (value && nextText !== (valueLabel ?? value)) onClear();
            setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (event.key === "Enter" && open && suggestions[active]) {
              event.preventDefault();
              pick(suggestions[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="border-border bg-background pr-9 pl-8"
        />
        {(text || value) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={m.locationCombobox_clearAriaLabel()}
            onClick={clear}
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      {popupVisible && (
        <ul
          id={listboxId}
          role="listbox"
          aria-busy={loading}
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-2xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-none"
        >
          {loading && suggestions.length === 0 ? (
            <li
              role="presentation"
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-3.5 animate-spin" />{" "}
              {m.locationCombobox_searchingText()}
            </li>
          ) : (
            suggestions.map((place, index) => {
              return (
                <li key={place.id} className="px-1.5 py-px">
                  <button
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(place);
                    }}
                    className={cn(
                      "flex w-full items-baseline gap-1.5 rounded-xl px-2 py-1.5 text-left text-sm outline-none",
                      index === active
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <span className="shrink-0 truncate">{place.name}</span>
                    {place.contextLabel ? (
                      <span className="truncate text-xs text-muted-foreground">
                        · {place.contextLabel}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
