/**
 * Shared blog-listing constants. The archive, tag, and author routes paginate
 * the same post collection, so they share ONE page size — matching the hosted
 * board's public blog listing (12 posts/page) so a board migrating hosted →
 * headless keeps the same pagination depth and indexed page URLs.
 */
export const BLOG_PAGE_SIZE = 12;
