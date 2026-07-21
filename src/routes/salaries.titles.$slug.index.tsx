import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  boardUrl,
  salaryLocationPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import {
  buildSalaryFaq,
  createBreadcrumbJsonLd,
  faqJsonLd,
  formatRange,
  titleSalaryJsonLd,
} from '@cavuno/board/seo';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, getTitleSalary } from '../server/queries';
import {
  SalaryNotFoundPage,
  SalaryPageLayout,
  SalaryPendingPage,
} from './-salary-page-layout';

import {
  companyCategorySalaryPath,
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
import { JsonLd } from '@/components/json-ld';
import { PageSection } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/salaries/titles/$slug/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let salary;
    try {
      salary = await getTitleSalary({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    // The API returns the board-language canonical slug as data and never 308s;
    // the starter performs the redirect (S3), mirroring the hosted board.
    if (salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/titles/$slug',
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
                loaderData?.seo.boardName,
                m.salaryDetail_titleMetaTitle({
                  title: loaderData.salary.categoryName,
                }),
              ),
            },
            {
              name: 'description',
              content: loaderData.salary.overallSalary
                ? m.salaryDetail_titleMetaDescriptionWithData({
                    title: loaderData.salary.categoryName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.salaryDetail_titleMetaDescriptionEmpty({
                    title: loaderData.salary.categoryName,
                  }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                salaryTitlePath(loaderData.salary.canonicalSlug),
              ),
            },
          ],
        }
      : {},
  component: TitleSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundTitle()} />
  ),
});

const rootApi = getRouteApi('__root__');

function TitleSalaryPage() {
  const { salary, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;

  const faqs = buildSalaryFaq(
    locale,
    salary.categoryName,
    salary.overallSalary,
  );
  const jsonLd = [
    titleSalaryJsonLd(locale, salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      {
        label: crumbs.salaries,
        href: boardUrl(seo.origin, BOARD_PATHS.salaries),
      },
      {
        label: crumbs.titles,
        href: boardUrl(seo.origin, BOARD_PATHS.salaryTitles),
      },
      { label: salary.categoryName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const companyItems: RailItem[] = salary.topCompanies.map((x) => ({
    name: x.companyName,
    href: companyCategorySalaryPath(x.companySlug, salary.canonicalSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }));
  const locationItems: RailItem[] = salary.topLocations.map((x) => ({
    name: x.placeName,
    href: salaryLocationPath(x.placeSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const skillItems: RailItem[] = salary.topSkills.map((x) => ({
    name: x.skillName,
    href: salarySkillPath(x.skillSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const relatedItems: RailItem[] = salary.relatedTitles.map((x) => ({
    name: x.categoryName,
    href: salaryTitlePath(x.categorySlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
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
        seo.language,
        seo.labels,
      )}
      title={m.salaryDetail_titleHeading({ title: salary.categoryName })}
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
                  href={salaryTitleLocationsPath(salary.canonicalSlug)}
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
              m.salaryDetail_topSkills(),
              skillItems,
              seo.language,
              seo.labels,
            )}
          />
          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_relatedTitles(),
              relatedItems,
              seo.language,
              seo.labels,
            )}
          />
          <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language, seo.labels)} />
        </>
      ) : (
        <SalaryEmptyState title={m.salaryDetail_notFoundTitle()} />
      )}
    </SalaryPageLayout>
  );
}
