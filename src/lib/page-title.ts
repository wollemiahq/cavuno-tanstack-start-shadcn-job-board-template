/**
 * The document-`<title>` seam: every page title ends with the board name,
 * separated by a pipe — `Page | {boardName}`.
 *
 * Listing routes compose titles in app code (via `listingPageTitle`) and pass
 * the finished string to `listingHead({ title })` — the SDK no longer joins
 * count/heading/board. This module is the shared composition helper for the
 * ~60 non-listing routes and for listing title composition, so both surfaces
 * agree by construction; `page-title.test.ts` pins them together.
 *
 * Two rules follow from that split:
 *
 * 1. A route that calls `listingHead` must pass a fully composed `title` —
 *    do NOT wrap the SDK result here, or the board name lands twice.
 * 2. Every other route composes with `headTitle(boardName, …parts)`,
 *    passing a board name its OWN loader resolved (`getSeoBase()` →
 *    `loaderData.seo.boardName`).
 *
 * ── Why the board name must come from the route's own loader ───────────
 *
 * The root loader resolves `board` on every request, so reading it off the
 * root match in `head({ matches })` looks free — and it type-checks. It
 * does not work. Route loaders run CONCURRENTLY with the root's, and a
 * child's `head()` is computed as soon as that child's loader settles, so
 * the root match is still `status: 'pending'` with no `loaderData` on it.
 * The board name would then appear or vanish depending on which loader won
 * the race — flaky titles, and silently absent under SSR, which is the one
 * place they have to be right. Verified against the dev server, not
 * inferred: `/` rendered `Find your next role` with the suffix missing.
 *
 * So a title may only use data the route itself awaited. That is the same
 * rule `listingHead` already follows (`listingHead({ title, …loaderData.seo })`),
 * which is why this seam takes an explicit `boardName` rather than reaching
 * for ambient state.
 */

/**
 * Separator between a page's own title and the board name. Locale-invariant
 * house style for English-led boards; listing titles use the same token.
 */
export const TITLE_SEPARATOR = ' | ';

/**
 * Join a page's title parts and the board name with the canonical
 * separator. Blank parts drop out, so an unresolved board name yields a
 * bare page title rather than a dangling ` | ` — that is the branch a
 * route takes when it renders before its loader data exists.
 *
 * Appending is idempotent: a last part that ALREADY carries the board name
 * doesn't get it twice. Several titles come from data this code doesn't
 * author — a CMS `seoTitle`, a legal page's title, a company name — and an
 * editor who types "… | Acme Careers" into an SEO title field should not
 * publish "… | Acme Careers | Acme Careers". Suffixing is the seam's job;
 * this makes saying so twice harmless rather than a bug.
 */
export function pageTitle(
  parts: ReadonlyArray<string | null | undefined>,
  boardName: string | null | undefined,
): string {
  const resolved = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  const board = boardName?.trim();
  return (
    endsWithBoardName(resolved.at(-1), board) ? resolved : [...resolved, board]
  )
    .filter((part): part is string => Boolean(part))
    .join(TITLE_SEPARATOR);
}

/**
 * Does the trailing part already carry the board name — either because it
 * IS the board name, or because it was authored as `… | Board`?
 */
function endsWithBoardName(
  last: string | undefined,
  board: string | undefined,
): boolean {
  if (!last || !board) return false;
  const lower = last.toLocaleLowerCase();
  const target = board.toLocaleLowerCase();
  return lower === target || lower.endsWith(`${TITLE_SEPARATOR}${target}`);
}

/**
 * Compose a route's `<title>` — the call every non-`listingHead` route
 * makes:
 *
 * ```ts
 * head: ({ loaderData }) => ({
 *   meta: [
 *     { title: headTitle(loaderData?.seo.boardName, m.settings_title()) },
 *   ],
 * })
 * ```
 *
 * Pass parts outermost-first (`headTitle(board, name, 'Blog')` →
 * `Name | Blog | Board`). Copy keys stay page-scoped: the board name is
 * appended HERE, never baked into a message value, because most title keys
 * are also rendered as a visible `<h1>` or a breadcrumb label.
 */
export function headTitle(
  boardName: string | null | undefined,
  ...parts: ReadonlyArray<string | null | undefined>
): string {
  return pageTitle(parts, boardName);
}
