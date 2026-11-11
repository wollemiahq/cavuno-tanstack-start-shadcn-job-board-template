/**
 * Head meta + ItemList/Breadcrumb JSON-LD live in getTitleLocationsPage so
 * `@cavuno/board/seo` stays out of the universal client entry.
 */
import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS, salaryTitlePath } from '@cavuno/board/paths';
import { createFileRoute, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { resolveRedirect } from '../server/queries';
import { getTitleLocationsPage } from '../server/salary-pages';
import { followManagedRedirect, requestedPath } from './-catch-all-loader';
import { SalaryNotFoundPage, SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
  salaryTitleInLocationPath,
  toSalaryBreadcrumbVM,
  toSalaryRailVM,
} from '@/board/salary-view-model';
import {
  SalaryEmptyState,
  SalaryRail,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

export const Route = createFileRoute('/salaries/titles/$slug/locations')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params, location }) => {
    let page;
    try {
      page = await getTitleLocationsPage({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error))
        return followManagedRedirect(resolveRedirect, requestedPath(location));
      throw error;
    }
    if (page.data.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/titles/$slug/locations',
        params: { slug: page.data.canonicalSlug },
        statusCode: 308,
      });
    }
    return page;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: TitleLocationsPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundTitle()} />
  ),
});

function TitleLocationsPage() {
  const { data } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy();
  const locale = getLocale();
  const items: RailItem[] = data.locations.map((l) => ({
    name: l.placeName,
    href: salaryTitleInLocationPath(data.canonicalSlug, l.placeSlug),
    range:
      formatSalaryRange(
        locale,
        l.avgSalaryMin,
        l.avgSalaryMax,
        data.currency,
      ) ?? '',
    jobCount: l.jobCount,
  }));

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.titles, href: BOARD_PATHS.salaryTitles },
          {
            name: data.categoryName,
            href: salaryTitlePath(data.canonicalSlug),
          },
          { name: crumbs.locations },
        ],
        getLocale(),
      )}
      title={m.salaryDetail_titleLocationsHeading({ title: data.categoryName })}
    >
      {items.length > 0 ? (
        <SalaryRail
          vm={toSalaryRailVM(
            m.salaryDetail_locationsLabel(),
            items,
            getLocale(),
          )}
        />
      ) : (
        <SalaryEmptyState
          title={m.salaryDetail_titleLocationsHeading({
            title: data.categoryName,
          })}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
