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
