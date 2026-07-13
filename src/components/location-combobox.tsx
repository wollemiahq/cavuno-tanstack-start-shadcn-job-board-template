"use client";

import { useEffect, useRef, useState } from "react";

import { Loading01, MarkerPin01, XClose } from "@untitledui/icons";
import { Button as AriaButton, Group as AriaGroup, Input as AriaInput } from "react-aria-components";

import type { PublicPlace } from "@cavuno/board";

import { cx } from "@/utils/cx";
import { m } from "../paraglide/messages";
import { searchPlaces } from "../server/queries";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

/**
 * Disambiguation context for a place suggestion. "London" alone is ambiguous
 * (UK, Ontario, …), so we surface the COUNTRY — resolved to a human-readable
 * name via the native `Intl.DisplayNames` (no dependency): "London · United
 * Kingdom" vs "London · Canada". Returns `null` when the API gives no country,
 * keeping the row to just the name.
 *
 * `regionCode` is intentionally omitted: the API returns it as the
 * country-prefixed ISO-3166-2 form (e.g. "GB-ENG"), which reads redundantly
 * next to the country name and adds noise rather than signal. The unfiltered
 * `jobCount` is likewise NOT shown — it is a per-place total that does not
 * react to the active keyword/filters, so it misleads.
 */
export function placeContextLabel(
  place: Pick<PublicPlace, "countryCode">,
  locale: string,
): string | null {
  if (!place.countryCode) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(place.countryCode) ?? place.countryCode;
  } catch {
    // A malformed code (not ISO-3166 alpha-2 / UN M49) throws — fall back to
    // the raw code rather than blanking the whole suggestion list.
    return place.countryCode;
  }
}

interface LocationComboboxProps {
  /** The active location slug from the URL (cold load), if any. */
  value?: string;
  /** Display name for the active slug when known (e.g. a /jobs/locations page). */
  valueLabel?: string;
  onSelect: (place: { slug: string; name: string }) => void;
  onClear: () => void;
}

/**
 * Location search field — the hosted board's `board-place-search-field`: type a
 * place name, pick from debounced `places.list({ q })` autocomplete suggestions
 * (each with its live job count). Selecting one applies the place slug as the
 * jobs filter (server defaults the radius to 50 km).
 *
 * Recomposed for the ADR-0072 contract step (CAV-489) from Untitled UI
 * primitives — a react-aria `Group`/`Input`/`Button` shell with UUI Input
 * styling, `@untitledui/icons`, and the `cx` class-merge seam. The bespoke
 * async state machine (debounce, min-query gate, keyboard nav, outside-click)
 * is preserved verbatim: the stock UUI ComboBox renders ghost autocomplete
 * text with a transparent input and no loading/clear affordance, which cannot
 * express this field's visible-text + job-count + clear behaviour.
 */
export function LocationCombobox({ value, valueLabel, onSelect, onClear }: LocationComboboxProps) {
  const [text, setText] = useState(valueLabel ?? value ?? "");
  const [suggestions, setSuggestions] = useState<PublicPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete: derive the suggestion list from the typed query.
  useEffect(() => {
    const q = text.trim();
    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void searchPlaces({ data: { q, limit: 10 } })
        .then((res) => {
          if (cancelled) return;
          setSuggestions(res.data.filter((place) => place.slug));
          setActive(0);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

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

  const pick = (place: PublicPlace) => {
    if (!place.slug) return;
    setText(place.name);
    setOpen(false);
    onSelect({ slug: place.slug, name: place.name });
  };

  const clear = () => {
    setText("");
    setSuggestions([]);
    setOpen(false);
    onClear();
  };

  return (
    <div ref={boxRef} className="relative">
      <AriaGroup
        className={({ isFocusWithin }) =>
          cx(
            "relative flex w-full items-center rounded-lg bg-primary shadow-xs ring-1 ring-primary transition-shadow duration-100 ease-linear ring-inset",
            isFocusWithin && "ring-2 ring-brand",
          )
        }
      >
        <MarkerPin01 className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-fg-quaternary" />
        <AriaInput
          type="text"
          aria-label={m.locationCombobox_locationAriaLabel()}
          placeholder={m.locationCombobox_placeholderText()}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
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
          className="w-full appearance-none bg-transparent py-2 pr-10 pl-10 text-md text-primary outline-hidden placeholder:text-placeholder"
        />
        {(text || value) && (
          <AriaButton
            aria-label={m.locationCombobox_clearAriaLabel()}
            onPress={clear}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-fg-quaternary transition duration-100 ease-linear hover:text-fg-quaternary_hover focus:text-fg-quaternary_hover focus:outline-hidden"
          >
            <XClose className="size-5" />
          </AriaButton>
        )}
      </AriaGroup>
      {open && (loading || suggestions.length > 0) && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary_alt outline-hidden">
          {loading && suggestions.length === 0 ? (
            <li className="flex items-center gap-2 px-2 py-1.5 text-sm text-tertiary">
              <Loading01 className="size-3.5 animate-spin" /> {m.locationCombobox_searchingText()}
            </li>
          ) : (
            suggestions.map((place, index) => {
              const context = placeContextLabel(place, "en");
              return (
                <li key={place.id} className="px-1.5 py-px">
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(place);
                    }}
                    className={cx(
                      "flex w-full items-baseline gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-primary",
                      index === active ? "bg-primary_hover" : "hover:bg-primary_hover",
                    )}
                  >
                    <span className="shrink-0 truncate">{place.name}</span>
                    {context ? (
                      <span className="truncate text-xs text-tertiary">· {context}</span>
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
