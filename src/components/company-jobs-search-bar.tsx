"use client";

import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { ListingSearchBand } from "@/components/board/listing-page-header";
import { m } from "../paraglide/messages";

/**
 * The company-jobs subpage keyword search (CAV-501, CAV-511) — a thin wrapper
 * of the shared `ListingSearchBand`, so it is the SAME white panel the jobs,
 * companies, and blog headers use (no duplicate search-band markup). Scoped to
 * ONE company: it submits to that company's jobs subpage
 * (`/companies/$companySlug/jobs?q=`), backed by the jobs SEARCH endpoint with
 * a `companyId` filter. Submitting a fresh `search` drops `?page=`, resetting
 * pagination to page 1.
 */
export function CompanyJobsSearchBar({
  companySlug,
  defaultValue,
}: {
  companySlug: string;
  defaultValue?: string;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(defaultValue ?? "");

  return (
    <ListingSearchBand
      value={query}
      onChange={setQuery}
      onSubmit={() =>
        navigate({
          to: "/companies/$companySlug/jobs",
          params: { companySlug },
          search: { q: query || undefined },
        })
      }
      placeholder={m.companyJobs_searchPlaceholderText()}
      inputAriaLabel={m.searchBar_keywordAriaLabel()}
      searchLabel={m.searchBar_searchLabel()}
      searchAriaLabel={m.searchBar_searchAriaLabel()}
    />
  );
}
