/**
 * Place-ancestor breadcrumb chain for the `/jobs/locations/:location` pages —
 * the Layer-1b seam mapping the flat `taxonomy.places.list()` directory
 * (`id`/`parentId` edges, ancestors included server-side) into the hosted
 * board's crumb trail: country → … → current place, then the tag crumb on
 * combo pages (appended by the caller).
 *
 * `TaxonomyResolution` carries no hierarchy field — the hosted board reads
 * the chain from its internal places table, so the listing pages rebuild it
 * here the same way the salary pages do (`toLocationHierarchyCrumbs` in
 * `salary-view-model.ts`, which walks the `salaries.locations.list()` tree).
 * Every crumb — leaf included — takes the node's own short board-language
 * `displayName` from the directory (the resolution's qualified
 * `displayName`, e.g. "Sydney, New South Wales, Australia", is only the
 * fallback when the place is absent from the tree), and ancestors link by
 * their board-language `canonicalSlug`.
 */
import { jobsLocationPath } from '@cavuno/board/paths';

import { placeLinkSlug } from './place-link';

import type { PublicPlace, TaxonomyResolution } from '@cavuno/board';

export interface LocationHierarchyCrumb {
  name: string;
  href?: string;
}

type HierarchyPlace = Pick<
  PublicPlace,
  'id' | 'parentId' | 'slug' | 'canonicalSlug' | 'displayName'
>;

type HierarchyCurrent = {
  sourceSlug: string;
  canonicalSlug: string;
  displayName: string;
  /** A suggested place's ancestors, country first (its resolution's). */
  ancestors?: TaxonomyResolution['ancestors'];
};

/**
 * Crumbs for the resolved place only — callers prepend Home/Jobs and append
 * the tag. `linkCurrent` distinguishes the two hosted shapes: on the plain
 * location page the current place is terminal; on `/:keyword` and
 * `/skills/:skill` combos it links to its own listing (the tag is terminal).
 * The leaf links by `canonicalSlug` (the 308 target the route already emits),
 * ancestors by their directory `canonicalSlug` (falling back to `slug`).
 *
 * `ancestorPath` overrides the ancestor href builder for the combo pages:
 * ancestors ride the caller's axis (`{ancestor}/{keyword}` — facet
 * relaxation, "same jobs, wider area") while the leaf keeps its bare
 * `jobsLocationPath` (dropping the keyword is the real one-level-up; a
 * keyword-scoped leaf link would be a self-link to the page being rendered).
 *
 * A suggested place is not in the directory: its resolution carries its
 * ancestors instead, and one the board has no page for (`canonicalSlug`
 * `null`) stays unlinked.
 */
export function toJobsLocationHierarchyCrumbs(
  places: readonly HierarchyPlace[],
  current: HierarchyCurrent,
  options?: {
    linkCurrent?: boolean;
    ancestorPath?: (slug: string) => string;
  },
): LocationHierarchyCrumb[] {
  if (current.ancestors) {
    const ancestorPath = options?.ancestorPath ?? jobsLocationPath;
    return [
      ...current.ancestors.map((ancestor) =>
        ancestor.canonicalSlug
          ? {
              name: ancestor.displayName,
              href: ancestorPath(ancestor.canonicalSlug),
            }
          : { name: ancestor.displayName },
      ),
      options?.linkCurrent
        ? {
            name: current.displayName,
            href: jobsLocationPath(current.canonicalSlug),
          }
        : { name: current.displayName },
    ];
  }
  return toPlaceHierarchyCrumbs(places, current, {
    ...options,
    placePath: jobsLocationPath,
  });
}

/**
 * The same chain for any place-keyed page family: `placePath` builds the
 * family's page for a place slug (the leaf's href, and the ancestors' unless
 * `ancestorPath` overrides it). The talent location pages pass
 * `talentLocationPath` with the `talent.places.list()` directory, which has
 * the same id/parentId/slug/canonicalSlug/displayName shape.
 */
export function toPlaceHierarchyCrumbs(
  places: readonly HierarchyPlace[],
  current: HierarchyCurrent,
  options: {
    placePath: (slug: string) => string;
    linkCurrent?: boolean;
    ancestorPath?: (slug: string) => string;
  },
): LocationHierarchyCrumb[] {
  const linkCurrent = options.linkCurrent ?? false;
  const ancestorPath = options.ancestorPath ?? options.placePath;
  const leafHref = () => options.placePath(current.canonicalSlug);
  const byId = new Map(places.map((node) => [node.id, node]));
  // A resolution's source or canonical slug can match either directory slug.
  const bySlug = new Map(
    places.flatMap((node) =>
      [node.slug, node.canonicalSlug].flatMap((slug) =>
        slug ? [[slug, node] as const] : [],
      ),
    ),
  );
  let node =
    bySlug.get(current.sourceSlug) ?? bySlug.get(current.canonicalSlug);
  const chain: (typeof places)[number][] = [];
  const seen = new Set<string>();
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    chain.unshift(node);
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  if (chain.length === 0) {
    return [
      linkCurrent
        ? { name: current.displayName, href: leafHref() }
        : { name: current.displayName },
    ];
  }
  return chain.map((entry, index) => {
    const isLeaf = index === chain.length - 1;
    const ancestorSlug = placeLinkSlug(entry);
    const href = isLeaf
      ? linkCurrent
        ? leafHref()
        : undefined
      : ancestorSlug
        ? ancestorPath(ancestorSlug)
        : undefined;
    return href
      ? { name: entry.displayName, href }
      : { name: entry.displayName };
  });
}
