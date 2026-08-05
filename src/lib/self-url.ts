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
import { localizeHref } from '../paraglide/runtime';

export function selfUrl(origin: string, path: string): string {
  return `${origin}${localizeHref(path)}`;
}
