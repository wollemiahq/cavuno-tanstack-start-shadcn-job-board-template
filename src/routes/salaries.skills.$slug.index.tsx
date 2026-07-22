import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  boardUrl,
  companySalaryPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import {
  buildSalaryFaq,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatRange,
  skillSalaryJsonLd,
} from '@cavuno/board/seo';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, getSkillSalary } from '../server/queries';
import {
  SalaryNotFoundPage,
  SalaryPageLayout,
  SalaryPendingPage,
} from './-salary-page-layout';

import {
  salaryEntityTitle,
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
import { JsonLd } from '@/components/json-ld';
import { PageSection } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/salaries/skills/$slug/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let salary;
    try {
      salary = await getSkillSalary({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/skills/$slug',
        params: { slug: salary.canonicalSlug },
        statusCode: 308,
      });
    }
    const seo = await getSeoBase();
    return { salary, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData.seo.boardName,
                loaderData.salary.overallSalary
                  ? salaryEntityTitle(
                      loaderData.seo.language,
                      loaderData.salary.skillName,
                      formatRange(
                        loaderData.seo.language,
                        loaderData.salary.overallSalary.avgMin,
                        loaderData.salary.overallSalary.avgMax,
                      ),
                    )
                  : m.salaryDetail_skillHeading({
                      skill: loaderData.salary.skillName,
                    }),
              ),
            },
            {
              name: 'description',
              content: loaderData.salary.overallSalary
                ? m.salaryDetail_skillMetaDescriptionWithData({
                    skill: loaderData.salary.skillName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.salaryDetail_skillMetaDescriptionEmpty({
                    skill: loaderData.salary.skillName,
                  }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                salarySkillPath(loaderData.salary.canonicalSlug),
              ),
            },
          ],
        }
      : {},
  component: SkillSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundSkill()} />
  ),
});

const rootApi = getRouteApi('__root__');

function SkillSalaryPage() {
  const { salary, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;

  const faqs = buildSalaryFaq(locale, salary.skillName, salary.overallSalary);
  const jsonLd = [
    skillSalaryJsonLd(salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      {
        label: crumbs.salaries,
        href: boardUrl(seo.origin, BOARD_PATHS.salaries),
      },
      {
        label: crumbs.skills,
        href: boardUrl(seo.origin, BOARD_PATHS.salarySkills),
      },
      { label: salary.skillName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const companyItems: RailItem[] = salary.topCompanies.map((x) => ({
    name: x.companyName,
    href: companySalaryPath(x.companySlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }));
  // Cross-axis: "{Skill} salaries in {Place}" (mirrors the hosted board). The
  // skill×location loader resolves + 308s the inbound placeSlug, so the target
  // always has data — unlike the generic /salaries/locations/{place} page.
  const locationItems: RailItem[] = salary.topLocations.map((x) => ({
    name: x.placeName,
    href: salarySkillInLocationPath(salary.canonicalSlug, x.placeSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const titleItems: RailItem[] = salary.topTitles.map((x) => ({
    name: x.categoryName,
    href: salaryTitlePath(x.categorySlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const relatedItems: RailItem[] = salary.relatedSkills.map((x) => ({
    name: x.skillName,
    href: salarySkillPath(x.skillSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
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
        seo.language,
        seo.labels,
      )}
      title={heading}
    >
      <JsonLd data={jsonLd} />
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
                board.language,
                seo.labels,
              )}
            />
          ) : null}

          {salary.bySeniority.length > 0 ? (
            <PageSection title={m.salaryDetail_seniorityHeading()}>
              <SenioritySalaryTable
                vm={toSeniorityTableVM(
                  salary.bySeniority,
                  board.language,
                  seo.labels,
                )}
              />
            </PageSection>
          ) : null}

          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_topCompanies(),
              companyItems,
              seo.language,
              seo.labels,
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
              <SalaryRail
                vm={toSalaryRailVM('', locationItems, seo.language, seo.labels)}
              />
            </PageSection>
          ) : null}
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_topTitles(),
              titleItems,
              seo.language,
              seo.labels,
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_relatedSkills(),
              relatedItems,
              seo.language,
              seo.labels,
            )}
          />
          <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language, seo.labels)} />
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
