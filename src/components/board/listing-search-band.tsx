'use client';

import { useRef } from 'react';

import { Search, X } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
/**
 * The shared search band: a keyword input with a leading search icon, an
 * inline clear action, a primary Search button, and optional slots for
 * surface-specific controls.
 * inside every listing header: a keyword input with a leading search icon, an
 * inline clear (the X inside the field), and a primary Search button, with
 * optional slots for the extra controls a surface needs (the jobs location
 * field, or the facet-pill row). Companies, blog, jobs, and the not-found
 * headers all consume THIS markup — there is no duplicate search-band markup
 * anywhere.
 *
 * The keyword is controlled local state owned by the
 * parent; `onChange` mutates only that state (never the URL), and the URL is
 * committed ONLY on form submit (Enter in the field or the Search button) via
 * `onSubmit`. The inline X clears the field locally (`onChange("")`) and
 * refocuses it — submit-only still applies, so clearing then requires a submit
 * to move the URL. This shell is shared by the local-state surfaces (companies,
 * blog, not-found) and the URL-seeded surface (jobs).
 */
export function ListingSearchBand({
  value,
  onChange,
  onSubmit,
  placeholder,
  inputAriaLabel,
  searchLabel,
  searchAriaLabel,
  leadingSlot,
  belowSlot,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  inputAriaLabel: string;
  searchLabel: string;
  searchAriaLabel?: string;
  /** Rides between the keyword input and Search (e.g. the jobs location field). */
  leadingSlot?: React.ReactNode;
  /** A second row under the search row (e.g. the jobs facet pills). */
  belowSlot?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="bg-card ring-border flex flex-col gap-3 rounded-2xl p-4 shadow-lg ring-1"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* The keyword field carries its own inline clear: a leading search
            icon, and — only when the field is non-empty — a trailing X that
            empties just this field and refocuses it. The X sits inside the
            input's own reserved right padding (pr-10), so it never shifts the
            layout as it appears/disappears. */}
        <div className="lg:min-w-56 lg:flex-1">
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              type="search"
              aria-label={inputAriaLabel}
              placeholder={placeholder}
              value={value}
              onChange={(event) => onChange(event.currentTarget.value)}
            />
            {value ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={m.searchBar_clearAriaLabel()}
                  onClick={() => {
                    onChange('');
                    inputRef.current?.focus();
                  }}
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
        </div>
        {leadingSlot ? (
          <div className="lg:w-64 lg:shrink-0">{leadingSlot}</div>
        ) : null}
        <Button
          type="submit"
          size="lg"
          aria-label={searchAriaLabel}
          className="lg:shrink-0"
        >
          <Search data-icon="inline-start" aria-hidden="true" />
          {searchLabel}
        </Button>
      </div>
      {belowSlot}
    </form>
  );
}
