/**
 * Two-letter initials for an Avatar fallback (mirrors the JobCard pattern):
 * the first letter of the first two words, uppercased. Returns `undefined`
 * for an empty/whitespace name so the Avatar falls back to its icon.
 */
export function initialsOf(name: string): string | undefined {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0]!)
      .slice(0, 2)
      .join('')
      .toUpperCase() || undefined
  );
}
