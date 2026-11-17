/**
 * Head meta + Occupation/FAQ/Breadcrumb JSON-LD live in getLocationSalaryPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { isNotFound, type LocationSalaryDetail } from '@cavuno/board';
import {
  BOARD_PATHS,
  salaryLocationPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import { createFileRoute, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { resolveRedirect } from '../server/queries';
import { getLocationSalaryPage } from '../server/salary-pages';
import { followManagedRedirect, requestedPath } from './-catch-all-loader';
import { SalaryNotFoundPage, SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
  indexableSalaryItems,
  salarySkillLinkPath,
  salaryTitleInLocationPath,
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryFaqVM,
  toSalaryRailVM,
} from '@/board/salary-view-model';
import {
  SalaryEmptyState,
  OverallSalaryCard,
  SalaryFaq,
  SalaryRail,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageSection } from '@/components/layout/page';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

type City = LocationSalaryDetail['childLocations'][number];

const cityItem =
  (locale: string, currency: string | null | undefined) =>
  (x: City): RailItem => ({
    name: x.placeName,
    href: salaryLocationPath(x.placeSlug),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        // Child cities carry their own currency on the wire.
        x.currency ?? currency,
      ) ?? '',
    jobCount: x.jobCount,
  });

export const Route = createFileRoute('/salaries/locations/$slug/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params, location }) => {
    let page;
    try {
      page = await getLocationSalaryPage({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error))
        return followManagedRedirect(resolveRedirect, requestedPath(location));
      throw error;
    }
    if (page.salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/locations/$slug',
        params: { slug: page.salary.canonicalSlug },
        statusCode: 308,
      });
    }
    return page;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: LocationSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundPlace()} />
  ),
});

function LocationSalaryPage() {
  const { salary, hierarchy, faqs } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy();
  const locale = getLocale();

  // The place hierarchy is the breadcrumb tail (country → region → current),
  // ancestors linked and the current place terminal — used by the visible
  // trail VM, mirroring the hosted board.
  const hierarchyCrumbs = hierarchy.map((c) => ({
    name: c.name,
    href: c.href,
  }));

  // Every linked row carries the Board API's `indexable` verdict for the page
  // it links to; rails keep only indexable pages. On a city the top titles
  // are that title in this city and link the title-by-location page; on a
  // region or country they are board-wide and link the title page. Skills
  // link their jobs page (skill salary pages are never indexed).
  const isCity =
    salary.adminLevel === 'city' || salary.adminLevel === 'locality';
  const categoryItems: RailItem[] = indexableSalaryItems(
    salary.topCategories,
  ).map((x) => ({
    name: x.categoryName,
    href: isCity
      ? salaryTitleInLocationPath(x.categorySlug, salary.canonicalSlug)
      : salaryTitlePath(x.categorySlug),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        salary.currency,
      ) ?? '',
    jobCount: x.jobCount,
  }));
  const toCityItem = cityItem(locale, salary.currency);
  const childItems = indexableSalaryItems(salary.childLocations).map(
    toCityItem,
  );
  const regionGroups = salary.childLocationsByRegion.map((group) => ({
    regionSlug: group.regionSlug,
    regionName: group.regionName,
    items: indexableSalaryItems(group.cities).map(toCityItem),
  }));
  const siblingItems = indexableSalaryItems(salary.siblingLocations).map(
    toCityItem,
  );
  const skillItems: RailItem[] = salary.topSkills.map((x) => ({
    name: x.skillName,
    href: salarySkillLinkPath(x.skillSlug),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        salary.currency,
      ) ?? '',
    jobCount: x.jobCount,
  }));
  const hasSalaryContent = Boolean(
    salary.overallSalary ||
    childItems.length ||
    regionGroups.some((group) => group.items.length) ||
    siblingItems.length ||
    categoryItems.length ||
    skillItems.length ||
    faqs.length,
  );
  const heading = m.salaryDetail_placeHeading({ place: salary.placeName });

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.locations, href: BOARD_PATHS.salaryLocations },
          ...hierarchyCrumbs,
        ],
        getLocale(),
      )}
      title={heading}
    >
      {hasSalaryContent ? (
        <>
          {salary.overallSalary ? (
            <OverallSalaryCard
              vm={toOverallSalaryVM(
                {
                  avgMin: salary.overallSalary.avgMin,
                  avgMax: salary.overallSalary.avgMax,
                  jobCount: salary.overallSalary.jobCount,
                  medianMin: salary.overallSalary.medianMin,
                  medianMax: salary.overallSalary.medianMax,
                  p25Min: salary.overallSalary.p25Min,
                  p75Max: salary.overallSalary.p75Max,
                },
                getLocale(),
                salary.currency,
              )}
            />
          ) : null}

          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_citiesInPlaceLabel({ place: salary.placeName }),
              childItems,
              getLocale(),
            )}
          />

          {regionGroups.map((group) => (
            <SalaryRail
              key={group.regionSlug}
              vm={toSalaryRailVM(group.regionName, group.items, getLocale())}
            />
          ))}

          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_otherLocations(),
              siblingItems,
              getLocale(),
            )}
          />

          {categoryItems.length > 0 ? (
            <PageSection title={m.salaryDetail_topTitles()}>
              <SalaryRail vm={toSalaryRailVM('', categoryItems, getLocale())} />
            </PageSection>
          ) : null}
          {skillItems.length > 0 ? (
            <PageSection title={m.salaryDetail_topSkills()}>
              <SalaryRail vm={toSalaryRailVM('', skillItems, getLocale())} />
            </PageSection>
          ) : null}
          <SalaryFaq vm={toSalaryFaqVM(faqs, getLocale())} />
        </>
      ) : (
        <SalaryEmptyState
          title={heading}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
