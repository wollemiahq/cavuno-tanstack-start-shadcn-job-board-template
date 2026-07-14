/**
 * Locations directory — `/jobs/locations/` (hosted parity:
 * `boards/[slug]/(main)/jobs/locations/page.tsx`). The API's `/places` returns
 * every place used by a published job with its subtree-summed `jobCount` plus
 * `id`/`parentId`; we rebuild the *same nested hierarchy* the hosted index
 * renders — roots and each node's children sorted by job count, descending
 * (identical to the hosted `buildHierarchy`).
 *
 * The owned Page family supplies the single main landmark and content width;
 * shadcn Badge and Empty compositions present the nested directory without
 * changing its route, hierarchy, or SEO data contracts.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import type { PublicPlace } from "@cavuno/board";

import { Page, PageContent, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { JsonLd } from "../components/json-ld";
import { listingHead, listingJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { getSeoBase, listPlaces } from "../server/queries";

export const Route = createFileRoute("/jobs/locations/")({
  staticData: { ownsMain: true },
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
                className="rounded-sm text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {node.place.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">{node.place.name}</span>
            )}
            <Badge variant="secondary">{node.place.jobCount}</Badge>
          </div>
          {node.children.length > 0 ? (
            <div className="mt-1 ml-4 border-l border-border pl-3">
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
    <Page width="content">
      <JsonLd
        data={listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [{ name: crumbs.jobs, path: "/" }, { name: crumbs.locations }],
        })}
      />
      <PageContent header={<PageHeader title={m.jobsLocationsIndex_heading()} />}>
        {tree.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPin />
              </EmptyMedia>
              <EmptyTitle>{m.jobsLocationsIndex_heading()}</EmptyTitle>
              <EmptyDescription>{m.jobsLocationsIndex_emptyText()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <PlaceTree nodes={tree} />
        )}
      </PageContent>
    </Page>
  );
}
