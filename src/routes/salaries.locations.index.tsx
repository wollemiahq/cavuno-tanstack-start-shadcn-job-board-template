import { boardCopy } from '#/copy';

import { type SalaryLocation } from '@cavuno/board';
import { BOARD_PATHS, boardUrl, salaryLocationPath } from '@cavuno/board/paths';
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, listSalaryLocations } from '../server/queries';
import { SalaryPageLayout, SalaryPendingPage } from './-salary-page-layout';

import { toSalaryBreadcrumbVM } from '@/board/salary-view-model';
import { SalaryEmptyState } from '@/components/board/salary-sections';
import { JsonLd } from '@/components/json-ld';
import { headTitle } from '@/lib/page-title';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/salaries/locations/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async () => {
    const [locations, seo] = await Promise.all([
      listSalaryLocations(),
      getSeoBase(),
    ]);
    return { locations: locations.data, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData?.seo.boardName,
                m.salaryHub_locationsMetaTitle(),
              ),
            },
            {
              name: 'description',
              content: m.salaryHub_locationsMetaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                BOARD_PATHS.salaryLocations,
              ),
            },
          ],
        }
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
  const { board } = rootApi.useLoaderData();
  const nodes = byParent.get(parentSlug) ?? [];
  if (nodes.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {nodes.map((n) => (
        <li key={n.placeSlug}>
          <a
            href={salaryLocationPath(n.placeSlug)}
            className="text-foreground outline-ring hover:text-foreground/80 rounded-xs font-medium transition-colors hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {n.placeName}
          </a>
          <span className="text-muted-foreground text-sm tabular-nums">
            {' · '}
            {formatRange(board.language, n.avgSalaryMin, n.avgSalaryMax)}
            {' · '}
            {n.jobCount === 1
              ? m.salaryHub_jobCountSingular({ count: n.jobCount })
              : m.salaryHub_jobCountPlural({ count: n.jobCount })}
          </span>
          {byParent.has(n.placeSlug) ? (
            <div className="border-border mt-1 ml-3 border-l pl-3">
              <LocationTree parentSlug={n.placeSlug} byParent={byParent} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SalaryLocationsIndex() {
  const { locations, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const byParent = childrenByParent(locations);
  const hasLocations = (byParent.get(null) ?? []).length > 0;

  const jsonLd = [
    itemListJsonLd(
      locations.map((l) => ({
        name: l.placeName,
        url: boardUrl(seo.origin, salaryLocationPath(l.placeSlug)),
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      {
        label: crumbs.salaries,
        href: boardUrl(seo.origin, BOARD_PATHS.salaries),
      },
      { label: crumbs.locations },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.locations },
        ],
        seo.language,
        seo.labels,
      )}
      title={m.salaryHub_locationsHeading()}
    >
      <JsonLd data={jsonLd} />
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
