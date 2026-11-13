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
  salarySkillLinkPath,
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

  // The API's top titles and skills for a place are board-wide figures, not
  // the place's: the counts match the board-wide title pages, and the
  // "{Title} in {Place}" page 404s where the place has too little data. So
  // each card links the board-wide title page its figures come from, and
  // skills link their jobs page (skill salary pages are never indexed).
  const categoryItems: RailItem[] = salary.topCategories.map((x) => ({
    name: x.categoryName,
    href: salaryTitlePath(x.categorySlug),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        salary.currency,
      ) ?? '',
    jobCount: x.jobCount,
  }));
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
    salary.childLocations.length ||
    salary.childLocationsByRegion.length ||
    salary.siblingLocations.length ||
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

          {salary.childLocations.length > 0 ? (
            <SalaryRail
              vm={toSalaryRailVM(
                m.salaryDetail_citiesInPlaceLabel({ place: salary.placeName }),
                salary.childLocations.map(cityItem(locale, salary.currency)),
                getLocale(),
              )}
            />
          ) : null}

          {salary.childLocationsByRegion.map((group) => (
            <SalaryRail
              key={group.regionSlug}
              vm={toSalaryRailVM(
                group.regionName,
                group.cities.map(cityItem(locale, salary.currency)),
                getLocale(),
              )}
            />
          ))}

          {salary.siblingLocations.length > 0 ? (
            <SalaryRail
              vm={toSalaryRailVM(
                m.salaryDetail_otherLocations(),
                salary.siblingLocations.map(cityItem(locale, salary.currency)),
                getLocale(),
              )}
            />
          ) : null}

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
