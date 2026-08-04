/**
 * Head meta + Occupation/Breadcrumb JSON-LD live in getSkillLocationSalaryPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS, salarySkillPath } from '@cavuno/board/paths';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSkillLocationSalaryPage } from '../server/salary-pages';
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

export const Route = createFileRoute('/salaries/skills/$slug/$locationSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let page;
    try {
      page = await getSkillLocationSalaryPage({
        data: { slug: params.slug, locationSlug: params.locationSlug },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (
      page.salary.skillCanonicalSlug !== params.slug ||
      page.salary.locationCanonicalSlug !== params.locationSlug
    ) {
      throw redirect({
        to: '/salaries/skills/$slug/$locationSlug',
        params: {
          slug: page.salary.skillCanonicalSlug,
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
  component: SkillLocationSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundSkillAndPlace()} />
  ),
});

const rootApi = getRouteApi('__root__');

function SkillLocationSalaryPage() {
  const { salary, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language);
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;
  const sk = salary.skillCanonicalSlug;

  const toPlaceRail = (rows: typeof salary.childLocations): RailItem[] =>
    rows.map((x) => ({
      name: x.placeName,
      href: salarySkillInLocationPath(sk, x.placeSlug),
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
  const heading = m.salaryDetail_skillInPlaceHeading({
    skill: salary.skillName,
    place: salary.placeName,
  });

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.skills, href: BOARD_PATHS.salarySkills },
          { name: salary.skillName, href: salarySkillPath(sk) },
          { name: salary.placeName },
        ],
        seo.language
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
                board.language
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
                  board.language
                )}
              />
            </PageSection>
          ) : null}

          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_citiesLabel(),
              toPlaceRail(salary.childLocations),
              seo.language
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_otherLocations(),
              toPlaceRail(salary.otherLocations),
              seo.language
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_topSkills(),
              skillItems,
              seo.language
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_relatedTitles(),
              titleItems,
              seo.language
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
