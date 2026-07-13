"use client";

import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { ListingSearchBand } from "@/components/board/listing-page-header";
import { m } from "../paraglide/messages";

/**
 * The companies index keyword search (CAV-487, CAV-502) — a thin wrapper of
 * the shared `ListingSearchBand`, so it is the SAME white panel the jobs and
 * blog headers use (no duplicate search-band markup). Semantics unchanged: a
 * free-text query matched against company name, submitting to the companies
 * index results (`/companies?query=`), backed by `companies.search`.
 */
export function CompanySearchBar({ defaultValue }: { defaultValue?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(defaultValue ?? "");

  return (
    <ListingSearchBand
      value={query}
      onChange={setQuery}
      onSubmit={() => navigate({ to: "/companies", search: { query: query || undefined } })}
      placeholder={m.companySearchBar_placeholderText()}
      inputAriaLabel={m.searchBar_keywordAriaLabel()}
      searchLabel={m.searchBar_searchLabel()}
      searchAriaLabel={m.searchBar_searchAriaLabel()}
    />
  );
}
