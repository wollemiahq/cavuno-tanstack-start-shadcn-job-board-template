/**
 * `<link rel="alternate" type="text/markdown">` to the current page's
 * Markdown twin, for agents that read the HTML head. Rendered inside
 * <head> by the root document.
 *
 * Whether a page has a twin comes from the twin resolver
 * (src/lib/markdown-twin/routes.ts), the same allowlist the server entry
 * serves from, so the link and the twin cannot drift apart. The href is
 * same-origin and localized (`/vacatures.md`, `/fr/index.md`) even when
 * the page canonicalizes elsewhere, because the twin is served here. A
 * page that did not render (not found, error) links no twin.
 */
import { useRouterState } from '@tanstack/react-router';

import { localizePath } from '../lib/localized-path';
import { pageMarkdownTwin } from '../lib/markdown-twin/routes';

/** The twin path for a localized page path, or null when it has none. */
function markdownAlternatePath(localizedPath: string): string | null {
  const twin = pageMarkdownTwin({
    method: 'GET',
    url: new URL(localizedPath, 'https://board.invalid').href,
  });
  return twin?.twinPath ?? null;
}

export function MarkdownAlternateLink({ origin }: { origin: string }) {
  // The router exposes the DELOCALIZED href (rewrite.input); the twin
  // lives at the localized path.
  const href = useRouterState({ select: (state) => state.location.href });
  const rendered = useRouterState({
    select: (state) =>
      state.matches.every(
        (match) => match.status !== 'notFound' && match.status !== 'error',
      ),
  });
  if (!rendered) return null;
  const path = href.split(/[?#]/, 1)[0] ?? '/';
  const twinPath = markdownAlternatePath(localizePath(path));
  if (!twinPath) return null;
  return (
    <link rel="alternate" type="text/markdown" href={`${origin}${twinPath}`} />
  );
}
