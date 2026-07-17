/**
 * Signed-in page titles compose in CODE as `Page | {boardName}` — the same
 * shape the SDK's `listingHead` emits for public listings — never in the
 * message catalogs (the board name is runtime data, not translatable copy).
 *
 * `head()` cannot read the root loader (the root match is still pending when
 * a child's `head()` runs), so callers thread the board name through their
 * OWN loader via `getSeoBase()`. When loader data is unavailable (error
 * boundaries), pass `undefined` and the bare page name renders.
 */
export function pageTitle(page: string, boardName: string | undefined): string {
  return boardName ? `${page} | ${boardName}` : page;
}
