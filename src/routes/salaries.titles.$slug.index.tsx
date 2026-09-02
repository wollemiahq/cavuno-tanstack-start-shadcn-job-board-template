/**
 * Head meta + Occupation/FAQ/Breadcrumb JSON-LD live in getTitleSalaryPage so
 * `@cavuno/board/seo` stays out of the universal client entry.
 */
import { isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import { Link, createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getTitleSalaryPage } from '../server/salary-pages';
import { SalaryNotFoundPage, SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  companyCategorySalaryPath,
  formatSalaryRange,
  salaryTitleInLocationPath,
  salaryTitleLocationsPath,
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

export const Route = createFileRoute('/salaries/titles/$slug/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let page;
    try {
      page = await getTitleSalaryPage({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    // The API returns the board-language canonical slug as data; the starter
    // owns the 308 redirect, mirroring the hosted board.
    if (page.salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/titles/$slug',
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
  component: TitleSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundTitle()} />
  ),
});

function TitleSalaryPage() {
  const { salary, faqs } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy();
  const locale = getLocale();

  const companyItems: RailItem[] = salary.topCompanies.map((x) => ({
    name: x.companyName,
    href: companyCategorySalaryPath(x.companySlug, salary.canonicalSlug),
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
  // Cross-axis: "{Title} salaries in {Place}" (mirrors the hosted board). The
  // generic /salaries/locations/{place} page has no data for a place that only
  // exists inside this title's sample, so link the title×location page whose
  // loader resolves + 308s the inbound placeSlug to its canonical form.
  const locationItems: RailItem[] = salary.topLocations.map((x) => ({
    name: x.placeName,
    href: salaryTitleInLocationPath(salary.canonicalSlug, x.placeSlug),
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
  const relatedItems: RailItem[] = salary.relatedTitles.map((x) => ({
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
  const hasSalaryContent = Boolean(
    salary.overallSalary ||
    salary.bySeniority.length ||
    companyItems.length ||
    locationItems.length ||
    skillItems.length ||
    relatedItems.length ||
    faqs.length,
  );

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.titles, href: BOARD_PATHS.salaryTitles },
          { name: salary.categoryName },
        ],
        getLocale(),
      )}
      title={m.salaryDetail_titleHeading({ title: salary.categoryName })}
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
                <Link
                  to={salaryTitleLocationsPath(salary.canonicalSlug)}
                  className={buttonVariants({ variant: 'link', size: 'sm' })}
                >
                  {m.salaryDetail_seeAllLocationsLabel()}
                </Link>
              }
            >
              <SalaryRail vm={toSalaryRailVM('', locationItems, getLocale())} />
            </PageSection>
          ) : null}
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_topSkills(),
              skillItems,
              getLocale(),
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_relatedTitles(),
              relatedItems,
              getLocale(),
            )}
          />
          <SalaryFaq vm={toSalaryFaqVM(faqs, getLocale())} />
        </>
      ) : (
        <SalaryEmptyState title={m.salaryDetail_notFoundTitle()} />
      )}
    </SalaryPageLayout>
  );
}
