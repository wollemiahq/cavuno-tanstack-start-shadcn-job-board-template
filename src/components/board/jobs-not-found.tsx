"use client";

import { useState } from "react";

import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { SearchLg } from "@untitledui/icons";

import { boardCopy } from "#/copy";

import { EmptyState } from "@/components/application/empty-state/empty-state";
import { ListingPageHeader, ListingSearchBand } from "@/components/board/listing-page-header";
import { PageBody } from "@/components/board/page-body";
import { m } from "../../paraglide/messages";

const rootApi = getRouteApi("__root__");

/**
 * The not-found state for the programmatic jobs pages (CAV-502). A visitor
 * can search a term and land on a slug that no longer resolves — so this
 * keeps the SAME shared listing header + search band (never a bare message
 * box), with an `EmptyState` below. The search re-runs against `/jobs`, so
 * the dead end is a place to search again.
 */
export function JobsNotFound({ message }: { message: string }) {
  const { board } = rootApi.useLoaderData();
  const copy = boardCopy(board.language, board.labels);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <PageBody
      band={
        <ListingPageHeader
          title={copy.jobSearch.headingJobs}
          subtitle={m.jobsHero_subtitle()}
          search={
            <ListingSearchBand
              value={query}
              onChange={setQuery}
              onSubmit={() => navigate({ to: "/jobs", search: { q: query || undefined } })}
              placeholder={copy.jobSearch.keywordPlaceholder}
              inputAriaLabel={copy.jobSearch.keywordLabel}
              searchLabel={m.jobSearch_searchButtonLabel()}
            />
          }
        />
      }
    >
      <EmptyState size="sm" className="py-12">
        <EmptyState.Header>
          <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
        </EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{copy.jobSearch.headingJobs}</EmptyState.Title>
          <EmptyState.Description>{message}</EmptyState.Description>
        </EmptyState.Content>
      </EmptyState>
    </PageBody>
  );
}
