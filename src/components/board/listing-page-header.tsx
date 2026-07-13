"use client";

import { useRef } from "react";

import { SearchLg, XClose } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";

import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { PageBreadcrumb, type BreadcrumbData } from "@/components/board/breadcrumb";
import { Text } from "@/components/text";
import { cx } from "@/utils/cx";
import { m } from "../../paraglide/messages";

/**
 * Migration-only listing header for routes that predate the canonical
 * `PageHeader`. Do not use `ListingPageHeader` for new pages; compose the
 * header through the `Page` family and use `Bleed` when the band must span the
 * viewport. Existing listing routes retain this component until migrated.
 *
 * The `search` slot still receives the shared `ListingSearchBand` (or a thin
 * wrapper of it), preserving current route behavior during that migration.
 */
export function ListingPageHeader({
  breadcrumb,
  eyebrow,
  title,
  subtitle,
  search,
}: {
  /** The resolved trail — seated (via `PageBreadcrumb`) as the band's first element, above the title. */
  breadcrumb?: BreadcrumbData;
  /** Optional eyebrow above the title (e.g. the home hero's honest job-count Badge). Omitted when absent. */
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: string | null;
  /** The search band (the shared `ListingSearchBand` / a wrapper of it). */
  search?: React.ReactNode;
}) {
  return (
    <section className="border-b border-secondary bg-secondary">
      {/* With a breadcrumb, the trail hugs the top of the band (compact
          pt-4/5, left-aligned at the container edge) through the SHARED
          `PageBreadcrumb` placement primitive — the same one the band-less
          pages seat via `PageBody` — so the spacing cannot diverge (CAV-511).
          The generous whitespace lives BETWEEN the trail and the centered
          title, so the crumb anchors near the nav instead of floating
          mid-band (CAV-510). */}
      {breadcrumb ? <PageBreadcrumb items={breadcrumb.items} ariaLabel={breadcrumb.ariaLabel} /> : null}
      <div
        className={cx(
          "mx-auto flex w-full max-w-container flex-col items-center gap-4 px-4 md:px-8",
          breadcrumb ? "pt-8 pb-10 md:pt-10 md:pb-14" : "py-10 md:py-14",
        )}
      >
        {eyebrow}
        <Text as="h1" variant="display" className="max-w-3xl text-center">
          {title}
        </Text>
        {subtitle ? (
          <p className="max-w-2xl text-center text-lg text-tertiary">{subtitle}</p>
        ) : null}
        {search ? <div className="mt-4 w-full max-w-5xl">{search}</div> : null}
      </div>
    </section>
  );
}

/**
 * The ONE search band (CAV-502, CAV-517) — the white rounded panel that lives
 * inside every listing header: a keyword input with a leading search icon, an
 * inline clear (the X inside the field), and a primary Search button, with
 * optional slots for the extra controls a surface needs (the jobs location
 * field, or the facet-pill row). Companies, blog, jobs, and the not-found
 * headers all consume THIS markup — there is no duplicate search-band markup
 * anywhere.
 *
 * SUBMIT-ONLY (CAV-517): the keyword is controlled local state owned by the
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
      className="flex flex-col gap-3 rounded-2xl bg-primary p-4 shadow-lg ring-1 ring-secondary_alt"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* The keyword field carries its own inline clear: a leading search
            icon, and — only when the field is non-empty — a trailing X that
            empties just this field and refocuses it. The X sits inside the
            input's own reserved right padding (pr-10), so it never shifts the
            layout as it appears/disappears. */}
        <div className="relative lg:min-w-56 lg:flex-1">
          <Input
            ref={inputRef}
            type="search"
            icon={SearchLg}
            aria-label={inputAriaLabel}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            inputClassName="pr-10"
            wrapperClassName="w-full"
          />
          {value ? (
            <AriaButton
              aria-label={m.searchBar_clearAriaLabel()}
              onPress={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-sm text-fg-quaternary transition duration-100 ease-linear hover:text-fg-quaternary_hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
            >
              <XClose className="size-5" />
            </AriaButton>
          ) : null}
        </div>
        {leadingSlot ? <div className="lg:w-64 lg:shrink-0">{leadingSlot}</div> : null}
        <Button
          type="submit"
          color="primary"
          size="md"
          iconLeading={SearchLg}
          aria-label={searchAriaLabel}
          className="lg:shrink-0"
        >
          {searchLabel}
        </Button>
      </div>
      {belowSlot}
    </form>
  );
}
