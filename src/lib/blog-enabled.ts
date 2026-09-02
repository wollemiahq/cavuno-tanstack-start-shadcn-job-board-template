import { readBoardContext } from './board-context-cache';

/**
 * The operator's `blogEnabled` kill switch, read off the board context the
 * same way the archive and post loaders read it. EVERY public blog surface
 * — archive, post, tag, author, RSS, OG image, OG JSON — must consult this,
 * or a blog-off board keeps serving posts through the surfaces that forgot.
 *
 * Server-only (reads the per-isolate context memo). Route loaders throw
 * `notFound()`; server route handlers return a bare 404 `Response`.
 */
export async function isBlogEnabled(
  readContext: () => Promise<{
    features: { blog: boolean };
  }> = readBoardContext,
): Promise<boolean> {
  const context = await readContext();
  return context.features.blog === true;
}

/** 404 for a server route handler (RSS / OG) on a blog-off board. */
export function blogDisabledResponse(): Response {
  return new Response('', { status: 404 });
}
