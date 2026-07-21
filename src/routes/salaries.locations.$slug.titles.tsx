import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS, boardUrl, salaryLocationPath } from '@cavuno/board/paths';
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocationTitles, getSeoBase } from '../server/queries';
import {
  SalaryNotFoundPage,
  SalaryPageLayout,
  SalaryPendingPage,
} from './-salary-page-layout';

import {
  salaryLocationTitlesPath,
  salaryTitleInLocationPath,
  toSalaryBreadcrumbVM,
  toSalaryRailVM,
} from '@/board/salary-view-model';
import {
  SalaryEmptyState,
  SalaryRail,
  type RailItem,
} from '@/components/board/salary-sections';
import { JsonLd } from '@/components/json-ld';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/salaries/locations/$slug/titles')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let data;
    try {
      data = await getLocationTitles({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (data.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/locations/$slug/titles',
        params: { slug: data.canonicalSlug },
        statusCode: 308,
      });
    }
    const seo = await getSeoBase();
    return { data, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData?.seo.boardName,
                m.salaryDetail_titlesInPlaceMetaTitle({
                  place: loaderData.data.placeName,
                }),
              ),
            },
            {
              name: 'description',
              content: m.salaryDetail_titlesInPlaceMetaDescription({
                place: loaderData.data.placeName,
                count: loaderData.data.titles.length,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                salaryLocationTitlesPath(loaderData.data.canonicalSlug),
              ),
            },
          ],
        }
      : {},
  component: LocationTitlesPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundPlace()} />
  ),
});

function LocationTitlesPage() {
  const { data, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const locale = seo.language;
  const items: RailItem[] = data.titles.map((t) => ({
    name: t.name,
    href: salaryTitleInLocationPath(t.slug, data.canonicalSlug),
    range: formatRange(locale, t.avgSalaryMin, t.avgSalaryMax),
    jobCount: t.jobCount,
  }));
  const jsonLd = [
    itemListJsonLd(
      data.titles.map((t) => ({
        name: t.name,
        url: boardUrl(
          seo.origin,
          salaryTitleInLocationPath(t.slug, data.canonicalSlug),
        ),
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: boardUrl(seo.origin, BOARD_PATHS.salaries) },
      {
        label: crumbs.locations,
        href: boardUrl(seo.origin, BOARD_PATHS.salaryLocations),
      },
      {
        label: data.placeName,
        href: boardUrl(seo.origin, salaryLocationPath(data.canonicalSlug)),
      },
      { label: crumbs.titles },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);
  const heading = m.salaryDetail_titlesInPlaceHeading({
    place: data.placeName,
  });

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.locations, href: BOARD_PATHS.salaryLocations },
          {
            name: data.placeName,
            href: salaryLocationPath(data.canonicalSlug),
          },
          { name: crumbs.titles },
        ],
        seo.language,
        seo.labels,
      )}
      title={heading}
    >
      <JsonLd data={jsonLd} />
      {items.length > 0 ? (
        <SalaryRail
          vm={toSalaryRailVM(
            m.salaryDetail_jobTitlesLabel(),
            items,
            seo.language,
            seo.labels,
          )}
        />
      ) : (
        <SalaryEmptyState
          title={heading}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
