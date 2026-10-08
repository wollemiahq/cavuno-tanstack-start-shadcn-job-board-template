export function catalogJobCount(
  visibleCount: number | undefined,
  gatedCount: number | undefined,
): number | undefined {
  if (visibleCount === undefined || !Number.isFinite(visibleCount)) {
    return undefined;
  }
  const withheld =
    gatedCount !== undefined && Number.isFinite(gatedCount) && gatedCount > 0
      ? gatedCount
      : 0;
  return visibleCount + withheld;
}

export function visiblePageSpan(
  page: number,
  pageSize: number,
  visibleCount: number,
): { from: number; to: number } | null {
  if (!(visibleCount > 0) || !(pageSize > 0) || !(page > 0)) return null;
  const from = (page - 1) * pageSize + 1;
  if (from > visibleCount) return null;
  return { from, to: Math.min(page * pageSize, visibleCount) };
}

/**
 * The Board API's keyword-relevance ranking limit: a relevance-ordered search
 * with a text query ranks only its top 1,000 matches, so its `count` stops at
 * this number and pagination ends there. Browse, filter-only listings and an
 * explicit sort keep exact counts.
 */
export const RELEVANCE_RANKING_LIMIT = 1000;

/**
 * Whether a listing's `count` is the ranking limit rather than the true total:
 * the request carried a text query (a `query`, or a category or skill listing,
 * which the API ranks as one), it was relevance-ordered, and the count reached
 * the limit. A browse that happens to hold exactly 1,000 jobs stays exact.
 */
export function isRelevanceCountCapped(request: {
  hasTextQuery: boolean;
  sort: string | undefined;
  count: number | undefined;
}): boolean {
  const relevance = request.sort === undefined || request.sort === 'relevance';
  return (
    request.hasTextQuery &&
    relevance &&
    request.count !== undefined &&
    request.count >= RELEVANCE_RANKING_LIMIT
  );
}

/**
 * The total a listing shows: the ranking limit when the count is capped
 * (withheld jobs cannot be added to a lower bound), else the visible count
 * plus any withheld jobs.
 */
export function displayedJobCount(
  visibleCount: number | undefined,
  gatedCount: number | undefined,
  countCapped: boolean,
): number | undefined {
  const total = catalogJobCount(visibleCount, gatedCount);
  return countCapped && total !== undefined ? RELEVANCE_RANKING_LIMIT : total;
}
