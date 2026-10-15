import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { TalentDirectoryNotFound } from './-talent-directory-not-found';
import { TalentDirectoryView } from './-talent-directory-view';
import { createTalentDirectoryLoader } from './-talent-loaders';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  parseTalentSearch,
  talentListingLoaderDeps,
} from '@/lib/talent-search';

export const Route = createFileRoute('/talent/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseTalentSearch,
  loaderDeps: ({ search }) => talentListingLoaderDeps(search),
  loader: createTalentDirectoryLoader(),
  head: ({ loaderData, match }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {
          meta: [
            {
              // A loader that threw notFound() still runs this head, so a page
              // that does not exist would otherwise advertise itself as the
              // talent directory. No loader data means no board name.
              title:
                match.status === 'notFound'
                  ? m.notFound_heading()
                  : m.talentDirectory_title(),
            },
          ],
        },
  component: TalentDirectoryPage,
  notFoundComponent: TalentDirectoryNotFound,
});

function TalentDirectoryPage() {
  return (
    <TalentDirectoryView
      data={Route.useLoaderData()}
      search={Route.useSearch()}
    />
  );
}
