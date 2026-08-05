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
 *
 * Head + breadcrumb JSON-LD are computed in getJobsLocationsIndexPage so
 * `@cavuno/board/seo` and breadcrumbsCopy stay out of the universal entry.
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { MapPin } from 'lucide-react';

import { jsonLdHeadScripts } from '../components/json-ld';
import { m } from '../paraglide/messages';
import { getJobsLocationsIndexPage } from '../server/jobs-listing-pages';

import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { PublicPlace } from '@cavuno/board';

export const Route = createFileRoute('/jobs/locations/')({
  staticData: { ownsMain: true },
  loader: () => getJobsLocationsIndexPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
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
    const children = (childrenOf.get(place.id) ?? []).sort(
      (a, b) => b.jobCount - a.jobCount,
    );
    return { place, children: children.map(buildNode) };
  };

  const roots = places.filter(
    (place) => !place.parentId || !byId.has(place.parentId),
  );
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
                className="text-foreground hover:text-primary focus-visible:ring-ring/30 rounded-sm underline-offset-4 transition-colors hover:underline focus-visible:ring-3 focus-visible:outline-none"
              >
                {node.place.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">{node.place.name}</span>
            )}
            <Badge variant="secondary">{node.place.jobCount}</Badge>
          </div>
          {node.children.length > 0 ? (
            <div className="border-border ms-4 mt-1 border-s ps-3">
              <PlaceTree nodes={node.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function LocationsIndexPage() {
  const { places } = Route.useLoaderData();
  const tree = buildHierarchy(places.data);

  return (
    <Page width="wide">
      <PageContent
        header={<PageHeader title={m.jobsLocationsIndex_heading()} />}
      >
        {tree.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPin />
              </EmptyMedia>
              <EmptyTitle>{m.jobsLocationsIndex_heading()}</EmptyTitle>
              <EmptyDescription>
                {m.jobsLocationsIndex_emptyText()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <PlaceTree nodes={tree} />
        )}
      </PageContent>
    </Page>
  );
}
