import { createFileRoute, Link } from '@tanstack/react-router';
import { MapPin } from 'lucide-react';

import { jsonLdHeadScripts } from '../components/json-ld';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getJobsLocationsIndexPage } from '../server/jobs-listing-pages';

import {
  buildJobsLocationDirectory,
  type LocationDirectoryNode,
} from '@/board/jobs-location-directory';
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

function PlaceTree({ nodes }: { nodes: LocationDirectoryNode<PublicPlace>[] }) {
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
            <Badge variant="secondary">
              {node.jobCount.toLocaleString(getLocale())}
            </Badge>
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
  const tree = buildJobsLocationDirectory(places.data, getLocale());

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
