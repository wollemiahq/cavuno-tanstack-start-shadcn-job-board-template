/**
 * Shared blog-listing constants. The archive, tag, and author routes paginate
 * the same post collection, so they share ONE page size — matching the hosted
 * board's public blog listing (12 posts/page) so a board migrating hosted →
 * headless keeps the same pagination depth and indexed page URLs.
 */
export const BLOG_PAGE_SIZE = 12;

/**
 * Lead a post list with the board's featured posts: `featured` first (in the
 * API's order), then `chronological` without any post already shown, each id
 * at most once, capped at `limit` when one is given. The chronological list's
 * own pagination is untouched; callers keep its cursor.
 */
export function featuredPostsFirst<T extends { id: string }>(
  featured: readonly T[],
  chronological: readonly T[],
  limit?: number,
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const post of [...featured, ...chronological]) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    merged.push(post);
  }
  return limit === undefined ? merged : merged.slice(0, limit);
}
