/**
 * Locations directory — `/jobs/locations/` (hosted parity:
 * `boards/[slug]/(main)/jobs/locations/page.tsx`). The API's `/places` returns
 * every place used by a published job with its subtree-summed `jobCount` plus
 * `id`/`parentId`; `PlaceDirectoryTree` rebuilds the *same nested hierarchy*
 * the hosted index renders — roots and each node's children sorted by job
 * count, descending (identical to the hosted `buildHierarchy`).
 *
 * The owned Page family supplies the single main landmark and content width;
 * shadcn Badge and Empty compositions present the nested directory without
 * changing its route, hierarchy, or SEO data contracts.
 *
 * Head + breadcrumb JSON-LD are computed in getJobsLocationsIndexPage so
 * `@cavuno/board/seo` and breadcrumbsCopy stay out of the universal entry.
 */
import { createFileRoute } from '@tanstack/react-router';
import { MapPin } from 'lucide-react';

import { jsonLdHeadScripts } from '../components/json-ld';
import { m } from '../paraglide/messages';
import { getJobsLocationsIndexPage } from '../server/jobs-listing-pages';

import { PlaceDirectoryTree } from '@/components/board/place-directory-tree';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const Route = createFileRoute('/jobs/locations/')({
  staticData: { ownsMain: true },
  loader: () => getJobsLocationsIndexPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: LocationsIndexPage,
});

function LocationsIndexPage() {
  const { places } = Route.useLoaderData();

  return (
    <Page width="wide">
      <PageContent
        header={<PageHeader title={m.jobsLocationsIndex_heading()} />}
      >
        {places.data.length === 0 ? (
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
          <PlaceDirectoryTree
            places={places.data}
            count={(place) => place.jobCount}
            route="/jobs/locations/$location"
          />
        )}
      </PageContent>
    </Page>
  );
}
