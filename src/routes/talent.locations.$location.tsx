/**
 * Talent location page — `/talent/locations/:location`, the talent
 * counterpart of `/jobs/locations/:location`: the talent directory filtered
 * to one place, widened to a search distance around a city or locality
 * (`within`). Place resolve + directory read + head run in ONE server fn
 * (404 / 308 like the jobs location page); the other directory filters ride
 * along as search params. The directory's access rules apply as on
 * `/talent`.
 */
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  TalentDirectoryNotFound,
  TalentDirectoryView,
} from './-talent-directory-view';
import { createTalentLocationLoader } from './-talent-loaders';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  parseTalentLocationSearch,
  talentLocationLoaderDeps,
} from '@/lib/talent-search';

export const Route = createFileRoute('/talent/locations/$location')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseTalentLocationSearch,
  loaderDeps: ({ search }) => talentLocationLoaderDeps(search),
  loader: createTalentLocationLoader(),
  head: ({ loaderData, match }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : match.status === 'notFound'
        ? { meta: [{ title: m.notFound_heading() }] }
        : {},
  component: TalentLocationPage,
  notFoundComponent: TalentDirectoryNotFound,
});

function TalentLocationPage() {
  const data = Route.useLoaderData();
  const { location } = Route.useParams();
  const search = Route.useSearch();
  return (
    <TalentDirectoryView
      data={data}
      // The place filters the results; saved lists and the empty state read
      // it from the search like a `/talent?place=` search.
      search={{ ...search, place: location }}
      heading={m.talentLocationPage_heading({
        place: data.place.displayName,
      })}
    />
  );
}
