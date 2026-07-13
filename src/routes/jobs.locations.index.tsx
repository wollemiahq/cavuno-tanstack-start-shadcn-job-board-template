/**
 * Locations directory — `/jobs/locations/` (hosted parity:
 * `boards/[slug]/(main)/jobs/locations/page.tsx`). The API's `/places` returns
 * every place used by a published job with its subtree-summed `jobCount` plus
 * `id`/`parentId`; we rebuild the *same nested hierarchy* the hosted index
 * renders — roots and each node's children sorted by job count, descending
 * (identical to the hosted `buildHierarchy`).
 *
 * Recomposed as an Untitled UI page (CAV-488): an UUI page header, the nested
 * place tree with router-seam links + count Badges, and the stock UUI
 * `EmptyState` when no place has published jobs. The hierarchy build and SEO
 * head/JSON-LD are byte-intact.
 */
import { Text } from "@/components/text"
import { createFileRoute, Link } from "@tanstack/react-router";
import { MarkerPin01 } from "@untitledui/icons";

import type { PublicPlace } from "@cavuno/board";

import { Badge } from "@/components/base/badges/badges";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { JsonLd } from "../components/json-ld";
import { listingHead, listingJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { getSeoBase, listPlaces } from "../server/queries";

export const Route = createFileRoute("/jobs/locations/")({
  loader: async () => {
    const [places, seo] = await Promise.all([listPlaces(), getSeoBase()]);
    return { places, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: "/jobs/locations",
          heading: m.jobsLocationsIndex_heading(),
        })
      : {},
  component: LocationsIndexPage,
});

interface PlaceNode {
  place: PublicPlace;
  children: PlaceNode[];
}

function buildHierarchy(places: PublicPlace[]): PlaceNode[] {
  const byId = new Map(places.map((place) => [place.id, place]));
  const childrenOf = new Map<string, PublicPlace[]>();

  for (const place of places) {
    if (place.parentId && byId.has(place.parentId)) {
      const siblings = childrenOf.get(place.parentId) ?? [];
      siblings.push(place);
      childrenOf.set(place.parentId, siblings);
    }
  }

  const buildNode = (place: PublicPlace): PlaceNode => {
    const children = (childrenOf.get(place.id) ?? []).sort((a, b) => b.jobCount - a.jobCount);
    return { place, children: children.map(buildNode) };
  };

  const roots = places.filter((place) => !place.parentId || !byId.has(place.parentId));
  roots.sort((a, b) => b.jobCount - a.jobCount);
  return roots.map(buildNode);
}

function PlaceTree({ nodes }: { nodes: PlaceNode[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((node) => (
        <li key={node.place.id}>
          <div className="flex items-center gap-2">
            {node.place.slug ? (
              <Link
                to="/jobs/locations/$location"
                params={{ location: node.place.slug }}
                className="rounded-xs text-secondary outline-focus-ring transition-colors hover:text-primary hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {node.place.name}
              </Link>
            ) : (
              <span className="text-tertiary">{node.place.name}</span>
            )}
            <Badge type="pill-color" color="gray" size="sm">
              {node.place.jobCount}
            </Badge>
          </div>
          {node.children.length > 0 ? (
            <div className="mt-1 ml-4 border-l border-secondary pl-3">
              <PlaceTree nodes={node.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function LocationsIndexPage() {
  const { places, seo } = Route.useLoaderData();
  const tree = buildHierarchy(places.data);
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;

  return (
    <div className="flex flex-col gap-8">
      <JsonLd
        data={listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [{ name: crumbs.jobs, path: "/" }, { name: crumbs.locations }],
        })}
      />
      <header className="flex max-w-3xl flex-col gap-4">
        <Text as="h1" variant="heading1" className="md:text-display-md">{m.jobsLocationsIndex_heading()}</Text>
      </header>
      {tree.length === 0 ? (
        <EmptyState size="sm" className="py-12">
          <EmptyState.Header>
            <EmptyState.FeaturedIcon icon={MarkerPin01} color="gray" theme="modern" />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>{m.jobsLocationsIndex_heading()}</EmptyState.Title>
            <EmptyState.Description>{m.jobsLocationsIndex_emptyText()}</EmptyState.Description>
          </EmptyState.Content>
        </EmptyState>
      ) : (
        <PlaceTree nodes={tree} />
      )}
    </div>
  );
}
