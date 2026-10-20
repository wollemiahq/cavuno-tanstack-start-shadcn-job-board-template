/**
 * Small helpers the place-keyed listing page functions share: the jobs
 * location family (`jobs-listing-pages.ts`) and the talent location pages
 * (`talent-pages.ts`), plus the `noindex, follow` robots meta the salary
 * pages (`salary-pages.ts`, `companies-pages.ts`) add from the API's
 * `indexable` verdict.
 */
import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';

import { localizePath } from '../lib/localized-path';

import type { TaxonomyResolution } from '@cavuno/board';

/** Same 404→null contract as `resolveOrNull` in queries.ts (kept private there). */
export async function resolveOrNull(
  promise: Promise<TaxonomyResolution>,
): Promise<TaxonomyResolution | null> {
  try {
    return await promise;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/**
 * Capture a rejection as a VALUE instead of letting it reject the batch.
 *
 * The listing endpoint 404s on an unknown category/skill slug. Now that the
 * listing shares a `Promise.all` with its taxonomy resolve, an unrecognised
 * slug used to reject the whole batch BEFORE the resolve's verdict could be
 * read — turning a 404 page into a 500. Holding the outcome lets the resolve
 * decide: unknown slug -> `not_found`, alias -> 308, and on a slug that
 * really exists the listing's error is re-thrown unchanged, so a genuine
 * backend failure is never masked as a missing page.
 */
export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

export async function settled<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

/** `{name, href}` trail → `listingJsonLd` `{name, path}` crumbs (localized). */
export function trailJsonLd(trail: { name: string; href?: string }[]) {
  return trail.map((crumb) =>
    crumb.href
      ? { name: crumb.name, path: localizePath(crumb.href) }
      : { name: crumb.name },
  );
}

/**
 * A `{name, href}` trail as `BreadcrumbList` JSON-LD (localized hrefs on the
 * board origin). A crumb without a link before the last one, such as a
 * suggested place's ancestor the board has no page for, is left out: every
 * crumb but the last needs an `item` URL.
 */
export function trailBreadcrumbJsonLd(
  trail: { name: string; href?: string }[],
  origin: string,
) {
  return createBreadcrumbJsonLd(
    trail.map((crumb) => ({
      label: crumb.name,
      href: crumb.href ? localizePath(crumb.href) : undefined,
    })),
    { origin },
  );
}

/**
 * `head` with `noindex, follow` added when `noindex` holds: a filtered view
 * of a location page (a chosen distance, `within`, the exact place included,
 * or a place with none of its own listed, so only nearby results show; see
 * `isSearchRadiusViewNoindex`), whose plain URL stays canonical. Its links
 * are still followed.
 */
export function noindexFollow<T extends { meta: object[] }>(
  head: T,
  noindex: boolean,
): T {
  if (!noindex) return head;
  return {
    ...head,
    meta: [...head.meta, { name: 'robots', content: 'noindex, follow' }],
  };
}

/**
 * A salary payload or list item that may carry the API's `indexable` verdict.
 * `& object` lets a type without the field (older SDK types) pass the weak-type
 * check while a present field still has to be a boolean.
 */
type SalaryIndexable = { readonly indexable?: boolean } & object;

/**
 * A salary detail or link-list page is noindex only when the API says
 * `indexable: false`; an absent field (an older API) stays indexable.
 */
export function isSalaryPageNoindex(payload: SalaryIndexable): boolean {
  return payload.indexable === false;
}

/**
 * A salary hub's items carry whether the page each one links to is
 * indexable. The hub is indexable when at least one listed page is (an item
 * without the field counts as indexable), so an empty hub is noindex.
 */
export function isSalaryHubNoindex(items: readonly SalaryIndexable[]): boolean {
  return !items.some((item) => item.indexable !== false);
}
