import { isNotFound } from '@cavuno/board';
import { notFound } from '@tanstack/react-router';

/**
 * Run a blog page read alongside the board's blog flag, not after it.
 *
 * The flag comes from the per-isolate board context memo, which is a Board
 * API round trip whenever the isolate is new or the memo has expired. Awaiting
 * it first put that round trip in front of every cold blog render. The page
 * read is safe to start early: on a board with the blog off it fails with
 * `blog_disabled`, and the flag below answers 404 either way.
 */
export async function loadIfBlogEnabled<T>(
  isBlogEnabled: () => Promise<boolean>,
  read: () => Promise<T>,
): Promise<T> {
  const [enabled, page] = await Promise.allSettled([isBlogEnabled(), read()]);
  if (enabled.status === 'rejected') throw enabled.reason;
  if (!enabled.value) throw notFound();
  if (page.status === 'fulfilled') return page.value;
  if (isNotFound(page.reason)) throw notFound();
  throw page.reason;
}
