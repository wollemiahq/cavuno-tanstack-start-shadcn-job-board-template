/**
 * Clamp a list to at most `limit` visible items and report how many were
 * hidden. The single source of truth for the card surfaces' "show N chips,
 * then a +K overflow" treatment (job / company / talent / post cards), so
 * every dense list wraps to the same bounded height without re-deriving its
 * own slice and overflow math.
 *
 * Pure and item-type agnostic: callers keep rendering their own chips —
 * `TaxonomyTags` renders `visible` as links and appends the `+overflow`
 * badge — this helper only owns the split.
 *
 * @example
 * const { visible, overflow } = clampList(vm.tags, 3);
 * // visible: first ≤3 tags; overflow: max(0, tags.length - 3)
 */
export interface ClampedList<T> {
  /** The first `limit` items (fewer when the list is shorter). */
  visible: T[];
  /** How many items were dropped — 0 when everything fits. Render as `+K`. */
  overflow: number;
}

export function clampList<T>(
  items: readonly T[],
  limit: number,
): ClampedList<T> {
  const cap = Math.max(0, Math.floor(limit));
  const visible = items.slice(0, cap);
  return { visible, overflow: Math.max(0, items.length - visible.length) };
}
