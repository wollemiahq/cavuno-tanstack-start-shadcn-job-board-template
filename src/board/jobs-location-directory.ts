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

function directoryCounts<T extends LocationDirectoryPlace>(
  childrenOf: Map<string, T[]>,
): (place: T) => number {
  const countOf = new Map<string, number>();
  const count = (place: T): number => {
    const cached = countOf.get(place.id);
    if (cached !== undefined) return cached;
    const children = childrenOf.get(place.id) ?? [];
    if (children.length === 0) {
      countOf.set(place.id, place.jobCount);
      return place.jobCount;
    }
    let jobsInChildren = 0;
    let rowsInChildren = 0;
    for (const child of children) {
      jobsInChildren += count(child);
      rowsInChildren += child.jobCount;
    }
    const rowsOnThisPlace = place.jobCount - rowsInChildren;
    const jobs = Math.max(jobsInChildren, rowsOnThisPlace);
    countOf.set(place.id, jobs);
    return jobs;
  };
  return count;
}

export function buildJobsLocationDirectory<T extends LocationDirectoryPlace>(
  places: readonly T[],
  locale: string,
): LocationDirectoryNode<T>[] {
  const byId = new Map(places.map((place) => [place.id, place]));
  const childrenOf = childrenByParent(places);
  const directoryCount = directoryCounts(childrenOf);

  const byCountThenName = (a: T, b: T) => {
    const delta = directoryCount(b) - directoryCount(a);
    if (delta !== 0) return delta;
    return a.name.localeCompare(b.name, locale);
  };

  const buildNode = (place: T): LocationDirectoryNode<T> => {
    const children = [...(childrenOf.get(place.id) ?? [])].sort(
      byCountThenName,
    );
    return {
      place,
      jobCount: directoryCount(place),
      children: children.map(buildNode),
    };
  };

  const roots = places.filter(
    (place) => !place.parentId || !byId.has(place.parentId),
  );
  roots.sort(byCountThenName);
  return roots.map(buildNode);
}
