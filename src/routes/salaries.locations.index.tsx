/**
 * Head meta + ItemList/Breadcrumb JSON-LD live in getSalaryLocationsIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { type SalaryLocation } from '@cavuno/board';
import { BOARD_PATHS, salaryLocationPath } from '@cavuno/board/paths';
import { Link, createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSalaryLocationsIndexPage } from '../server/salary-pages';
import { SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
  toSalaryBreadcrumbVM,
} from '@/board/salary-view-model';
import { SalaryEmptyState } from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { entityCount } from '@/lib/entity-count';
import { chromeEntity } from '@/lib/site-chrome';

export const Route = createFileRoute('/salaries/locations/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: () => getSalaryLocationsIndexPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: SalaryLocationsIndex,
  pendingComponent: SalaryPendingPage,
});

// Rebuild the country → region → city tree from the flat parentSlug list.
function childrenByParent(items: SalaryLocation[]) {
  const map = new Map<string | null, SalaryLocation[]>();
  for (const it of items) {
    const arr = map.get(it.parentSlug) ?? [];
    arr.push(it);
    map.set(it.parentSlug, arr);
  }
  return map;
}

function LocationTree({
  parentSlug,
  byParent,
}: {
  parentSlug: string | null;
  byParent: Map<string | null, SalaryLocation[]>;
}) {
  const nodes = byParent.get(parentSlug) ?? [];
  if (nodes.length === 0) return null;
  const locale = getLocale();
  const entityOverrides = chromeEntity();
  return (
    <ul className="space-y-1.5">
      {nodes.map((n) => (
        <li key={n.placeSlug}>
          <Link
            to={salaryLocationPath(n.placeSlug)}
            className="text-foreground outline-ring hover:text-foreground/80 rounded-xs font-medium transition-colors hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {n.placeName}
          </Link>
          <span className="text-muted-foreground text-sm tabular-nums">
            {' · '}
            {formatSalaryRange(locale, n.avgSalaryMin, n.avgSalaryMax, null) ??
              ''}
            {' · '}
            {entityCount(n.jobCount, locale, m.count_jobs, {
              singular: entityOverrides.jobSingular,
              plural: entityOverrides.jobPlural,
            })}
          </span>
          {byParent.has(n.placeSlug) ? (
            <div className="border-border ms-3 mt-1 border-s ps-3">
              <LocationTree parentSlug={n.placeSlug} byParent={byParent} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SalaryLocationsIndex() {
  const { locations } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy();
  const byParent = childrenByParent(locations);
  const hasLocations = (byParent.get(null) ?? []).length > 0;

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.locations },
        ],
        getLocale(),
      )}
      title={m.salaryHub_locationsHeading()}
    >
      {hasLocations ? (
        <LocationTree parentSlug={null} byParent={byParent} />
      ) : (
        <SalaryEmptyState
          title={m.salaryHub_locationsEmptyTitle()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
