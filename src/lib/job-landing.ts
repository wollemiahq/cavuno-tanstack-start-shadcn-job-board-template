import { resolveJobLandingPage } from '@cavuno/board/paths';

import type {
  JobLandingConsolidationMap,
  JobLandingPageInput,
} from '@cavuno/board/paths';

/** `& object` lets an older SDK context type without the field pass. */
type ConsolidationSource = {
  readonly jobLandingConsolidation?: JobLandingConsolidationMap;
} & object;

/** The board's consolidation map; absent until the API sends one. */
export function jobLandingConsolidation(
  board: ConsolidationSource,
): JobLandingConsolidationMap | undefined {
  return board.jobLandingConsolidation;
}

/** The path to link a place job landing page by. */
export function jobLandingPath(
  page: JobLandingPageInput,
  consolidation: JobLandingConsolidationMap | undefined,
): string {
  return resolveJobLandingPage(page, consolidation).path;
}

/**
 * The path a place job landing page names as its canonical: the page it
 * duplicates by the board's map, else the listing's `canonicalPath` when the
 * API sends one, else its own path. The page stays live either way.
 */
export function jobLandingCanonicalPath(
  page: JobLandingPageInput,
  consolidation: JobLandingConsolidationMap | undefined,
  listing: { readonly canonicalPath?: string } & object = {},
): string {
  const resolved = resolveJobLandingPage(page, consolidation);
  return resolved.placeSlug === page.placeSlug
    ? (listing.canonicalPath ?? resolved.path)
    : resolved.path;
}
