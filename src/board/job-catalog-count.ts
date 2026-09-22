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
