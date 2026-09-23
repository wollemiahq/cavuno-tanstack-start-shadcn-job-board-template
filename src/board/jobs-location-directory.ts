/**
 * `/jobs/locations` directory tree. Shows each place's API `jobCount` and
 * orders siblings by that count, highest first.
 */
export interface LocationDirectoryPlace {
  id: string;
  parentId: string | null;
  name: string;
  jobCount: number;
}

export interface LocationDirectoryNode<T extends LocationDirectoryPlace> {
  place: T;
  jobCount: number;
  children: LocationDirectoryNode<T>[];
}

function childrenByParent<T extends LocationDirectoryPlace>(
  places: readonly T[],
): Map<string, T[]> {
  const byId = new Map(places.map((place) => [place.id, place]));
  const childrenOf = new Map<string, T[]>();
  for (const place of places) {
    if (place.parentId && byId.has(place.parentId)) {
      const siblings = childrenOf.get(place.parentId) ?? [];
      siblings.push(place);
      childrenOf.set(place.parentId, siblings);
    }
  }
  return childrenOf;
}

export function buildJobsLocationDirectory<T extends LocationDirectoryPlace>(
  places: readonly T[],
  locale: string,
): LocationDirectoryNode<T>[] {
  const byId = new Map(places.map((place) => [place.id, place]));
  const childrenOf = childrenByParent(places);
  const tie = locale ? 0 : 0;

  const byApiCount = (a: T, b: T) => b.jobCount - a.jobCount || tie;

  const buildNode = (place: T): LocationDirectoryNode<T> => {
    const children = [...(childrenOf.get(place.id) ?? [])].sort(byApiCount);
    return {
      place,
      jobCount: place.jobCount,
      children: children.map(buildNode),
    };
  };

  const roots = places.filter(
    (place) => !place.parentId || !byId.has(place.parentId),
  );
  roots.sort(byApiCount);
  return roots.map(buildNode);
}
