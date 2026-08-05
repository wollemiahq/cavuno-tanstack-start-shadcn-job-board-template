/**
 * Head meta + Occupation/FAQ/Breadcrumb JSON-LD live in getLocationSalaryPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { isNotFound, type LocationSalaryDetail } from '@cavuno/board';
import { BOARD_PATHS, salaryLocationPath } from '@cavuno/board/paths';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getLocationSalaryPage } from '../server/salary-pages';
import { SalaryNotFoundPage, SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
  salaryLocationSkillsPath,
  salaryLocationTitlesPath,
  salarySkillInLocationPath,
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
import { buttonVariants } from '@/components/ui/button';
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
  loader: async ({ params }) => {
    let page;
    try {
      page = await getLocationSalaryPage({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
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

  // Cross-axis: top titles/skills stay scoped to THIS place ("{Title} salaries
  // in {Place}"), matching the hosted board — not the bare title/skill pages.
  const categoryItems: RailItem[] = salary.topCategories.map((x) => ({
    name: x.categoryName,
    href: salaryTitleInLocationPath(x.categorySlug, salary.canonicalSlug),
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
    href: salarySkillInLocationPath(x.skillSlug, salary.canonicalSlug),
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
            <PageSection
              title={m.salaryDetail_topTitles()}
              actions={
                <a
                  href={salaryLocationTitlesPath(salary.canonicalSlug)}
                  className={buttonVariants({ variant: 'link', size: 'sm' })}
                >
                  {m.salaryDetail_seeAllTitlesInPlaceLabel({
                    place: salary.placeName,
                  })}
                </a>
              }
            >
              <SalaryRail vm={toSalaryRailVM('', categoryItems, getLocale())} />
            </PageSection>
          ) : null}
          {skillItems.length > 0 ? (
            <PageSection
              title={m.salaryDetail_topSkills()}
              actions={
                <a
                  href={salaryLocationSkillsPath(salary.canonicalSlug)}
                  className={buttonVariants({ variant: 'link', size: 'sm' })}
                >
                  {m.salaryDetail_seeAllSkillsInPlaceLabel({
                    place: salary.placeName,
                  })}
                </a>
              }
            >
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
