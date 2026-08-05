/**
 * Head meta + Occupation/FAQ/Breadcrumb JSON-LD live in getSkillSalaryPage so
 * `@cavuno/board/seo` stays out of the universal client entry.
 */
import { isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  companySalaryPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSkillSalaryPage } from '../server/salary-pages';
import { SalaryNotFoundPage, SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
  salarySkillInLocationPath,
  salarySkillLocationsPath,
  toOverallSalaryVM,
  toSalaryBreadcrumbVM,
  toSalaryFaqVM,
  toSalaryRailVM,
  toSeniorityTableVM,
} from '@/board/salary-view-model';
import {
  SalaryEmptyState,
  OverallSalaryCard,
  SalaryFaq,
  SalaryRail,
  SenioritySalaryTable,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageSection } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

export const Route = createFileRoute('/salaries/skills/$slug/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let page;
    try {
      page = await getSkillSalaryPage({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (page.salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/skills/$slug',
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
  component: SkillSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundSkill()} />
  ),
});

function SkillSalaryPage() {
  const { salary, seo, faqs } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language);
  const locale = getLocale();

  const companyItems: RailItem[] = salary.topCompanies.map((x) => ({
    name: x.companyName,
    href: companySalaryPath(x.companySlug),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        salary.currency,
      ) ?? '',
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }));
  // Cross-axis: "{Skill} salaries in {Place}" (mirrors the hosted board). The
  // skill×location loader resolves + 308s the inbound placeSlug, so the target
  // always has data — unlike the generic /salaries/locations/{place} page.
  const locationItems: RailItem[] = salary.topLocations.map((x) => ({
    name: x.placeName,
    href: salarySkillInLocationPath(salary.canonicalSlug, x.placeSlug),
    range:
      formatSalaryRange(
        locale,
        x.avgSalaryMin,
        x.avgSalaryMax,
        salary.currency,
      ) ?? '',
    jobCount: x.jobCount,
  }));
  const titleItems: RailItem[] = salary.topTitles.map((x) => ({
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
  const relatedItems: RailItem[] = salary.relatedSkills.map((x) => ({
    name: x.skillName,
    href: salarySkillPath(x.skillSlug),
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
    salary.bySeniority.length ||
    companyItems.length ||
    locationItems.length ||
    titleItems.length ||
    relatedItems.length ||
    faqs.length,
  );
  const heading = m.salaryDetail_skillHeading({ skill: salary.skillName });

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.skills, href: BOARD_PATHS.salarySkills },
          { name: salary.skillName },
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

          {salary.bySeniority.length > 0 ? (
            <PageSection title={m.salaryDetail_seniorityHeading()}>
              <SenioritySalaryTable
                vm={toSeniorityTableVM(
                  salary.bySeniority,
                  getLocale(),
                  salary.currency,
                )}
              />
            </PageSection>
          ) : null}

          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_topCompanies(),
              companyItems,
              getLocale(),
            )}
          />
          {locationItems.length > 0 ? (
            <PageSection
              title={m.salaryDetail_topLocations()}
              actions={
                <a
                  href={salarySkillLocationsPath(salary.canonicalSlug)}
                  className={buttonVariants({ variant: 'link', size: 'sm' })}
                >
                  {m.salaryDetail_seeAllLocationsLabel()}
                </a>
              }
            >
              <SalaryRail vm={toSalaryRailVM('', locationItems, getLocale())} />
            </PageSection>
          ) : null}
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_topTitles(),
              titleItems,
              getLocale(),
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_relatedSkills(),
              relatedItems,
              getLocale(),
            )}
          />
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
