/**
 * A place directory as a nested tree — the `/jobs/locations` and
 * `/talent/locations` index pages. The API lists every place with its
 * subtree-summed count plus `id`/`parentId`; this rebuilds the same nested
 * hierarchy the hosted index renders: roots and each node's children sorted
 * by count, descending. Each entry links its place page by its
 * board-language canonical slug, with the count as a badge.
 */
import { Link } from '@tanstack/react-router';

import { getLocale } from '../../paraglide/runtime';

import { placeLinkSlug } from '@/board/place-link';
import { Badge } from '@/components/ui/badge';
import type { PublicPlace } from '@cavuno/board';

export type DirectoryPlace = Pick<
  PublicPlace,
  'id' | 'parentId' | 'slug' | 'canonicalSlug' | 'displayName'
>;

/** The place page route each entry links to. */
export type PlaceDirectoryRoute =
  | '/jobs/locations/$location'
  | '/talent/locations/$location';

interface PlaceNode<T> {
  place: T;
  children: PlaceNode<T>[];
}

export function buildPlaceHierarchy<T extends DirectoryPlace>(
  places: readonly T[],
  count: (place: T) => number,
): PlaceNode<T>[] {
  const byId = new Map(places.map((place) => [place.id, place]));
  const childrenOf = new Map<string, T[]>();

  for (const place of places) {
    if (place.parentId && byId.has(place.parentId)) {
      const siblings = childrenOf.get(place.parentId) ?? [];
      siblings.push(place);
      childrenOf.set(place.parentId, siblings);
    }
  }

  const buildNode = (place: T): PlaceNode<T> => {
    const children = (childrenOf.get(place.id) ?? []).sort(
      (a, b) => count(b) - count(a),
    );
    return { place, children: children.map(buildNode) };
  };

  const roots = places.filter(
    (place) => !place.parentId || !byId.has(place.parentId),
  );
  roots.sort((a, b) => count(b) - count(a));
  return roots.map(buildNode);
}

function PlaceTree<T extends DirectoryPlace>({
  nodes,
  count,
  route,
}: {
  nodes: PlaceNode<T>[];
  count: (place: T) => number;
  route: PlaceDirectoryRoute;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((node) => {
        const slug = placeLinkSlug(node.place);
        return (
          <li key={node.place.id}>
            <div className="flex items-center gap-2">
              {slug ? (
                <Link
                  to={route}
                  params={{ location: slug }}
                  className="text-foreground hover:text-primary focus-visible:ring-ring/30 rounded-sm underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:outline-none"
                >
                  {node.place.displayName}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {node.place.displayName}
                </span>
              )}
              <Badge variant="secondary">
                {count(node.place).toLocaleString(getLocale())}
              </Badge>
            </div>
            {node.children.length > 0 ? (
              <div className="border-border ms-4 mt-1 border-s ps-3">
                <PlaceTree nodes={node.children} count={count} route={route} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function PlaceDirectoryTree<T extends DirectoryPlace>({
  places,
  count,
  route,
}: {
  places: readonly T[];
  /** The place's subtree count: jobs, or candidates. */
  count: (place: T) => number;
  route: PlaceDirectoryRoute;
}) {
  return (
    <PlaceTree
      nodes={buildPlaceHierarchy(places, count)}
      count={count}
      route={route}
    />
  );
}
