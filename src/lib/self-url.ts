/**
 * Absolute URL for THIS deployment at the viewer's locale. Canonicals,
 * og:url, and JSON-LD urls on locale-prefixed pages must reference the
 * locale variant itself (/de/jobs canonicalizes to /de/jobs, not /jobs) —
 * paired with the hreflang alternates the root document emits, that is
 * what makes the localized pages indexable instead of consolidating into
 * the base locale.
 *
 * `path` is the canonical (delocalized) path; `localizeHref` applies the
 * ambient request locale. NOT for job-detail canonicals — those point at
 * `links.public` (the hosted board is that content's SEO source of truth).
 */
import { baseLocale } from '../paraglide/runtime';
import { localizePath } from './localized-path';

export function selfUrl(origin: string, path: string): string {
  return `${origin}${localizePath(path)}`;
}

/**
 * An absolute URL on `origin` rewritten to the board language's (unprefixed)
 * localized URL — /jobs/x becomes /vacatures/x on a Dutch board — so it
 * never names a URL that redirects. URLs on other origins pass through.
 * For platform-composed URLs (job `links.public`, sitemap entries) that
 * use canonical route words.
 */
export function boardLanguageUrl(url: string, origin: string): string {
  const path =
    url === origin
      ? '/'
      : url.startsWith(`${origin}/`)
        ? url.slice(origin.length)
        : null;
  if (path === null) return url;
  return `${origin}${localizePath(path, { locale: baseLocale })}`;
}
