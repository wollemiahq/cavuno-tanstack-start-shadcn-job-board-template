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
 * The tree's slugs are source-language; every crumb — leaf included — takes
 * the node's own short `name` (the qualified `displayName`, e.g. "Sydney, New
 * South Wales, Australia", is only the fallback when the place is absent from
 * the tree).
 */
import { jobsLocationPath } from "@cavuno/board/paths";

import type { PublicPlace } from "@cavuno/board";

export interface LocationHierarchyCrumb {
  name: string;
  href?: string;
}

/**
 * Crumbs for the resolved place only — callers prepend Home/Jobs and append
 * the tag. `linkCurrent` distinguishes the two hosted shapes: on the plain
 * location page the current place is terminal; on `/:keyword` and
 * `/skills/:skill` combos it links to its own listing (the tag is terminal).
 * The leaf links by `canonicalSlug` (the 308 target the route already emits),
 * ancestors by their directory `slug`.
 *
 * `ancestorPath` overrides the ancestor href builder for the combo pages:
 * ancestors ride the caller's axis (`{ancestor}/{keyword}` — facet
 * relaxation, "same jobs, wider area") while the leaf keeps its bare
 * `jobsLocationPath` (dropping the keyword is the real one-level-up; a
 * keyword-scoped leaf link would be a self-link to the page being rendered).
 */
export function toJobsLocationHierarchyCrumbs(
  places: readonly Pick<PublicPlace, "id" | "parentId" | "slug" | "name">[],
  current: { sourceSlug: string; canonicalSlug: string; displayName: string },
  options?: {
    linkCurrent?: boolean;
    ancestorPath?: (slug: string) => string;
  },
): LocationHierarchyCrumb[] {
  const linkCurrent = options?.linkCurrent ?? false;
  const ancestorPath = options?.ancestorPath ?? jobsLocationPath;
  const leafHref = () => jobsLocationPath(current.canonicalSlug);
  const byId = new Map(places.map((node) => [node.id, node]));
  const bySlug = new Map(
    places.flatMap((node) => (node.slug ? [[node.slug, node] as const] : [])),
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
    const href = isLeaf
      ? linkCurrent
        ? leafHref()
        : undefined
      : entry.slug
        ? ancestorPath(entry.slug)
        : undefined;
    return href ? { name: entry.name, href } : { name: entry.name };
  });
}
