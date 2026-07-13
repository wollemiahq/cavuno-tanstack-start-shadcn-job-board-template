/**
 * Related-posts selection (CAV-500) — the pure seam the article page uses
 * to fill its "Related posts" rail. Posts sharing the current post's first
 * tag come first; the latest posts fill any remainder. The current post is
 * always excluded, a post surfaced by both sources appears once, and the
 * result is capped at `limit`. Pure over plain `{ id }` records so it stays
 * trivially testable and never touches the SDK.
 */
export function selectRelatedPosts<T extends { id: string }>({
  currentId,
  byTag,
  latest,
  limit,
}: {
  currentId: string
  /** Candidates sharing the current post's first tag (preferred). */
  byTag: T[]
  /** Latest-post fallback when too few candidates share the tag. */
  latest: T[]
  limit: number
}): T[] {
  const seen = new Set<string>([currentId])
  const related: T[] = []
  for (const post of [...byTag, ...latest]) {
    if (related.length >= limit) break
    if (seen.has(post.id)) continue
    seen.add(post.id)
    related.push(post)
  }
  return related
}
