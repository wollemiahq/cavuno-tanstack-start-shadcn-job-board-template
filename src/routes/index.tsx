import {
  parseListingFilters,
  type ListingFilters,
} from '@cavuno/board/filters';
/**
 * Home `/` — the designed landing, not the bare search page.
 * The root is a pure landing page. Old root search/filter URLs redirect to
 * `/jobs`, while the loader fetches only the latest jobs and the collections
 * needed by enabled landing sections.
 *
 * Head meta + ItemList JSON-LD are computed in getHomePage so
 * `@cavuno/board/seo` stays out of the universal client entry and React 19
 * streaming SSR reliably emits ld+json via head scripts.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';

import { getHomePage } from '../server/home-page';
import { HomePage } from './-home-page';

import { jsonLdHeadScripts } from '@/components/json-ld';

interface JobsSearch extends ListingFilters {
  cursor?: string;
}

export const Route = createFileRoute('/')({
  // Full-bleed: the landing owns its distinct hero and page containers.
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: Record<string, unknown>): JobsSearch => ({
    ...parseListingFilters(search),
    cursor:
      typeof search.cursor === 'string' && search.cursor
        ? search.cursor
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    const { cursor, ...jobsSearch } = search;
    const hasLegacyIntent =
      Boolean(cursor) ||
      Boolean(jobsSearch.q) ||
      Boolean(jobsSearch.remoteOption) ||
      Boolean(jobsSearch.employmentType) ||
      Boolean(jobsSearch.seniority?.length) ||
      Boolean(jobsSearch.sort);

    if (hasLegacyIntent) {
      throw redirect({
        to: '/jobs',
        search: jobsSearch,
        replace: true,
      });
    }
  },
  loader: () => getHomePage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: HomePage,
});
