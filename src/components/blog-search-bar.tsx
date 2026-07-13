"use client";

import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { ListingSearchBand } from "@/components/board/listing-page-header";
import { m } from "../paraglide/messages";

/**
 * The blog keyword search (CAV-487, CAV-502) — a thin wrapper of the shared
 * `ListingSearchBand`, so it is the SAME white panel the jobs and companies
 * headers use (no duplicate search-band markup). Present on every blog page
 * (index, author, tag), all submitting to the blog index results.
 * Route-agnostic: it navigates to `/blog?q=` regardless of where rendered.
 */
export function BlogSearchBar({ defaultValue }: { defaultValue?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(defaultValue ?? "");

  return (
    <ListingSearchBand
      value={query}
      onChange={setQuery}
      onSubmit={() => navigate({ to: "/blog", search: { q: query || undefined } })}
      placeholder={m.blogSearchBar_placeholderText()}
      inputAriaLabel={m.searchBar_keywordAriaLabel()}
      searchLabel={m.searchBar_searchLabel()}
      searchAriaLabel={m.searchBar_searchAriaLabel()}
    />
  );
}
