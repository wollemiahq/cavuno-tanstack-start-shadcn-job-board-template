import { boardCopy } from '#/copy';

import { isNotFound, type LocationSalaryDetail } from '@cavuno/board';
import { BOARD_PATHS, boardUrl, salaryLocationPath } from '@cavuno/board/paths';
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
import {
  getLocationSalary,
  getSeoBase,
  listSalaryLocations,
} from '../server/queries';
import {
  SalaryNotFoundPage,
  SalaryPageLayout,
  SalaryPendingPage,
} from './-salary-page-layout';

import {
  salaryLocationSkillsPath,
  salaryLocationTitlesPath,
  salaryPlaceTitle,
  salarySkillInLocationPath,
  salaryTitleInLocationPath,
  toLocationHierarchyCrumbs,
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
import { PageSection } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
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
    // The flat place tree is the only public-SDK source of place ancestry —
    // it rebuilds the country → region → city breadcrumb chain (the hosted
    // board reads the same hierarchy from its internal places table).
    const [seo, tree] = await Promise.all([
      getSeoBase(),
      // Breadcrumb enrichment only: on failure the trail degrades to the
      // place itself instead of faulting a page whose own data loaded fine.
      listSalaryLocations().catch(() => null),
    ]);
    const hierarchy = toLocationHierarchyCrumbs(
      tree?.data ?? [],
      salary.canonicalSlug,
      salary.placeName,
    );
    // The visible shell trail can't derive the ancestor chain from the URL, so
    // this route injects its fully-resolved trail (Home › Salaries › Locations
    // › {ancestors…} › {place}). The shell renders it verbatim.
    const crumbs = boardCopy(seo.language).breadcrumbs;
    const breadcrumbTrail = [
      { name: crumbs.home, href: BOARD_PATHS.home },
      { name: crumbs.salaries, href: BOARD_PATHS.salaries },
      { name: crumbs.locations, href: BOARD_PATHS.salaryLocations },
      ...hierarchy,
    ];
    return { salary, seo, hierarchy, breadcrumbTrail };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData.seo.boardName,
                salaryPlaceTitle(
                  loaderData.seo.language,
                  loaderData.salary.placeName,
                  loaderData.salary.overallSalary
                    ? formatRange(
                        loaderData.seo.language,
                        loaderData.salary.overallSalary.avgMin,
                        loaderData.salary.overallSalary.avgMax,
                      )
                    : null,
                ),
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
  const { salary, seo, hierarchy } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language).breadcrumbs;
  const { board } = rootApi.useLoaderData();
  const locale = seo.language;

  // The place hierarchy is the breadcrumb tail (country → region → current),
  // ancestors linked and the current place terminal — used by both the visible
  // trail VM and the BreadcrumbList JSON-LD, mirroring the hosted board.
  const hierarchyCrumbs = hierarchy.map((c) => ({
    name: c.name,
    href: c.href,
  }));

  const faqs = buildSalaryFaq(locale, salary.placeName, salary.overallSalary);
  const jsonLd = [
    locationSalaryJsonLd(salary),
    faqJsonLd(faqs),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      {
        label: crumbs.salaries,
        href: boardUrl(seo.origin, BOARD_PATHS.salaries),
      },
      {
        label: crumbs.locations,
        href: boardUrl(seo.origin, BOARD_PATHS.salaryLocations),
      },
      ...hierarchy.map((c) =>
        c.href
          ? { label: c.name, href: boardUrl(seo.origin, c.href) }
          : { label: c.name },
      ),
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  // Cross-axis: top titles/skills stay scoped to THIS place ("{Title} salaries
  // in {Place}"), matching the hosted board — not the bare title/skill pages.
  const categoryItems: RailItem[] = salary.topCategories.map((x) => ({
    name: x.categoryName,
    href: salaryTitleInLocationPath(x.categorySlug, salary.canonicalSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const skillItems: RailItem[] = salary.topSkills.map((x) => ({
    name: x.skillName,
    href: salarySkillInLocationPath(x.skillSlug, salary.canonicalSlug),
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
          ...hierarchyCrumbs,
        ],
        seo.language,
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
              )}
            />
          ) : null}

          {salary.childLocations.length > 0 ? (
            <SalaryRail
              vm={toSalaryRailVM(
                m.salaryDetail_citiesInPlaceLabel({ place: salary.placeName }),
                salary.childLocations.map(cityItem(locale)),
                seo.language,
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
              )}
            />
          ))}

          {salary.siblingLocations.length > 0 ? (
            <SalaryRail
              vm={toSalaryRailVM(
                m.salaryDetail_otherLocations(),
                salary.siblingLocations.map(cityItem(locale)),
                seo.language,
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
              <SalaryRail
                vm={toSalaryRailVM('', categoryItems, seo.language)}
              />
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
              <SalaryRail
                vm={toSalaryRailVM('', skillItems, seo.language)}
              />
            </PageSection>
          ) : null}
          <SalaryFaq vm={toSalaryFaqVM(faqs, seo.language)} />
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
