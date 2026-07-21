import { boardCopy } from '#/copy';

import { isNotFound, type LocationSalaryDetail } from '@cavuno/board';
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
  locationSalaryJsonLd,
} from '@cavuno/board/seo';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocationSalary, getSeoBase } from '../server/queries';
import {
  SalaryNotFoundPage,
  SalaryPageLayout,
  SalaryPendingPage,
} from './-salary-page-layout';

import {
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
import { JsonLd } from '@/components/json-ld';
import { headTitle } from '@/lib/page-title';

type City = LocationSalaryDetail['childLocations'][number];

const cityItem =
  (locale: string) =>
  (x: City): RailItem => ({
    name: x.placeName,
    href: salaryLocationPath(x.placeSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  });

export const Route = createFileRoute('/salaries/locations/$slug/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let salary;
    try {
      salary = await getLocationSalary({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (salary.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/locations/$slug',
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
                m.salaryDetail_placeMetaTitle({
                  place: loaderData.salary.placeName,
                }),
              ),
            },
            {
              name: 'description',
              content: loaderData.salary.overallSalary
                ? m.salaryDetail_placeMetaDescriptionWithData({
                    place: loaderData.salary.placeName,
                    range: formatRange(
                      loaderData.seo.language,
                      loaderData.salary.overallSalary.avgMin,
                      loaderData.salary.overallSalary.avgMax,
                    ),
                    jobCount: loaderData.salary.overallSalary.jobCount,
                  })
                : m.salaryDetail_placeMetaDescriptionEmpty({
                    place: loaderData.salary.placeName,
                  }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                salaryLocationPath(loaderData.salary.canonicalSlug),
              ),
            },
          ],
        }
      : {},
  component: LocationSalaryPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundPlace()} />
  ),
});

const rootApi = getRouteApi('__root__');

function LocationSalaryPage() {
  const { salary, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;

  const faqs = buildSalaryFaq(locale, salary.placeName, salary.overallSalary);
  const jsonLd = [
    locationSalaryJsonLd(salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: boardUrl(seo.origin, BOARD_PATHS.salaries) },
      {
        label: crumbs.locations,
        href: boardUrl(seo.origin, BOARD_PATHS.salaryLocations),
      },
      { label: salary.placeName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const categoryItems: RailItem[] = salary.topCategories.map((x) => ({
    name: x.categoryName,
    href: salaryTitlePath(x.categorySlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const skillItems: RailItem[] = salary.topSkills.map((x) => ({
    name: x.skillName,
    href: salarySkillPath(x.skillSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
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
          { name: salary.placeName },
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

          {salary.childLocations.length > 0 ? (
            <SalaryRail
              vm={toSalaryRailVM(
                m.salaryDetail_citiesInPlaceLabel({ place: salary.placeName }),
                salary.childLocations.map(cityItem(locale)),
                seo.language,
                seo.labels,
              )}
            />
          ) : null}

          {salary.childLocationsByRegion.map((group) => (
            <SalaryRail
              key={group.regionSlug}
              vm={toSalaryRailVM(
                group.regionName,
                group.cities.map(cityItem(locale)),
                seo.language,
                seo.labels,
              )}
            />
          ))}

          {salary.siblingLocations.length > 0 ? (
            <SalaryRail
              vm={toSalaryRailVM(
                m.salaryDetail_otherLocations(),
                salary.siblingLocations.map(cityItem(locale)),
                seo.language,
                seo.labels,
              )}
            />
          ) : null}

          <SalaryRail
            vm={toSalaryRailVM(
              m.salaryDetail_topTitles(),
              categoryItems,
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
