/**
 * Talent locations directory — `/talent/locations/`, the talent counterpart
 * of `/jobs/locations/`: the places the board's directory candidates live
 * in, nested country → region → city, each linking its talent location page
 * with its candidate count. The directory's access rules apply as on
 * `/talent`: Off is the site's 404, Employers only the restricted gate.
 *
 * Head + breadcrumb JSON-LD are computed in getTalentLocationsIndexPage so
 * `@cavuno/board/seo` and breadcrumbsCopy stay out of the universal entry.
 */
import { createFileRoute } from '@tanstack/react-router';
import { MapPin } from 'lucide-react';

import { m } from '../paraglide/messages';
import { RestrictedTalentDirectory } from './-restricted-talent-directory';
import { TalentDirectoryNotFound } from './-talent-directory-not-found';
import { createTalentLocationsIndexLoader } from './-talent-loaders';

import { PlaceDirectoryTree } from '@/components/board/place-directory-tree';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { useRootSession } from '@/components/root-session';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const Route = createFileRoute('/talent/locations/')({
  staticData: { ownsMain: true },
  loader: createTalentLocationsIndexLoader(),
  head: ({ loaderData, match }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : match.status === 'notFound'
        ? { meta: [{ title: m.notFound_heading() }] }
        : {},
  component: TalentLocationsIndexPage,
  notFoundComponent: TalentDirectoryNotFound,
});

function TalentLocationsIndexPage() {
  const { places, restricted, seo } = Route.useLoaderData();
  const { user } = useRootSession();

  if (restricted) {
    return (
      <RestrictedTalentDirectory
        boardName={seo.boardName}
        signedIn={user !== null}
      />
    );
  }

  return (
    <Page width="wide">
      <PageContent
        header={<PageHeader title={m.talentLocationsIndex_heading()} />}
      >
        {places.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPin />
              </EmptyMedia>
              <EmptyTitle>{m.talentLocationsIndex_heading()}</EmptyTitle>
              <EmptyDescription>
                {m.talentLocationsIndex_emptyText()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <PlaceDirectoryTree
            places={places}
            count={(place) => place.candidateCount}
            route="/talent/locations/$location"
          />
        )}
      </PageContent>
    </Page>
  );
}
