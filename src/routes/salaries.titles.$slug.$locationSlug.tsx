/**
 * Head meta + Occupation/Breadcrumb JSON-LD live in getTitleLocationSalaryPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS, salaryTitlePath } from '@cavuno/board/paths';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getTitleLocationSalaryPage } from '../server/salary-pages';
import { SalaryNotFoundPage, SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
  salarySkillInLocationPath,
  salaryTitleInLocationPath,
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryRailVM,
  toSeniorityTableVM,
} from '@/board/salary-view-model';
import {
  SalaryEmptyState,
  OverallSalaryCard,
  SalaryRail,
  SenioritySalaryTable,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageSection } from '@/components/layout/page';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

export const Route = createFileRoute('/salaries/titles/$slug/$locationSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let page;
    try {
      page = await getTitleLocationSalaryPage({
        data: { slug: params.slug, locationSlug: params.locationSlug },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    // Both axes must resolve to their canonical slug in the same redirect.
    if (
      page.salary.categoryCanonicalSlug !== params.slug ||
      page.salary.locationCanonicalSlug !== params.locationSlug
    ) {
      throw redirect({
        to: '/salaries/titles/$slug/$locationSlug',
        params: {
          slug: page.salary.categoryCanonicalSlug,
          locationSlug: page.salary.locationCanonicalSlug,
        },
        statusCode: 308,
      });
    }
    return page;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: TitleLocationSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundTitleAndPlace()} />
  ),
});

const rootApi = getRouteApi('__root__');

function TitleLocationSalaryPage() {
  const { salary, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language, seo.labels);
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;
  const cat = salary.categoryCanonicalSlug;

  const toPlaceRail = (rows: typeof salary.childLocations): RailItem[] =>
    rows.map((x) => ({
      name: x.placeName,
      href: salaryTitleInLocationPath(cat, x.placeSlug),
      range: formatSalaryRange(locale, x.avgSalaryMin, x.avgSalaryMax),
      jobCount: x.jobCount,
    }));

  // Cross-axis rails stay scoped to THIS place (skill/title salaries in the
  // current location), matching the hosted board — not the bare axis pages.
  const skillItems: RailItem[] = salary.topSkills.map((x) => ({
    name: x.skillName,
    href: salarySkillInLocationPath(x.skillSlug, salary.locationCanonicalSlug),
    range: formatSalaryRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const titleItems: RailItem[] = salary.topTitles.map((x) => ({
    name: x.categoryName,
    href: salaryTitleInLocationPath(
      x.categorySlug,
      salary.locationCanonicalSlug,
    ),
    range: formatSalaryRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const hasSalaryContent = Boolean(
    salary.overallSalary ||
    salary.bySeniority.length ||
    salary.childLocations.length ||
    salary.otherLocations.length ||
    skillItems.length ||
    titleItems.length,
  );
  const heading = m.salaryDetail_titleInPlaceHeading({
    title: salary.categoryName,
    place: salary.placeName,
  });

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.titles, href: BOARD_PATHS.salaryTitles },
          { name: salary.categoryName, href: salaryTitlePath(cat) },
          { name: salary.placeName },
        ],
        seo.language,
        seo.labels,
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
                  p25Min: salary.overallSalary.p25Min ?? undefined,
                  p75Max: salary.overallSalary.p75Max ?? undefined,
                },
                board.language,
                seo.labels,
              )}
            />
          ) : null}

          {salary.bySeniority.length > 0 ? (
            <PageSection title={m.salaryDetail_seniorityHeading()}>
              <SenioritySalaryTable
                vm={toSeniorityTableVM(
                  salary.bySeniority.map((r) => ({
                    ...r,
                    boardAvgMin: null,
                    boardAvgMax: null,
                    diffPercent: null,
                  })),
                  board.language,
                  seo.labels,
                )}
              />
            </PageSection>
          ) : null}

          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_citiesLabel(),
              toPlaceRail(salary.childLocations),
              seo.language,
              seo.labels,
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_otherLocations(),
              toPlaceRail(salary.otherLocations),
              seo.language,
              seo.labels,
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_topSkills(),
              skillItems,
              seo.language,
              seo.labels,
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_relatedTitles(),
              titleItems,
              seo.language,
              seo.labels,
            )}
          />
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
