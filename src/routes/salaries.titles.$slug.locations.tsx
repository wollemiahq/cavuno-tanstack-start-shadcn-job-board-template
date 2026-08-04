import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS, boardUrl, salaryTitlePath } from '@cavuno/board/paths';
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, getTitleLocations } from '../server/queries';
import {
  SalaryNotFoundPage,
  SalaryPageLayout,
  SalaryPendingPage,
} from './-salary-page-layout';

import {
  salaryTitleInLocationPath,
  salaryTitleLocationsPath,
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

export const Route = createFileRoute('/salaries/titles/$slug/locations')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let data;
    try {
      data = await getTitleLocations({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (data.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/titles/$slug/locations',
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
                m.salaryDetail_titleLocationsMetaTitle({
                  title: loaderData.data.categoryName,
                }),
              ),
            },
            {
              name: 'description',
              content:
                loaderData.data.locations.length === 1
                  ? m.salaryDetail_titleLocationsMetaDescriptionOne({
                      title: loaderData.data.categoryName,
                      count: loaderData.data.locations.length,
                    })
                  : m.salaryDetail_titleLocationsMetaDescriptionMany({
                      title: loaderData.data.categoryName,
                      count: loaderData.data.locations.length,
                    }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                salaryTitleLocationsPath(loaderData.data.canonicalSlug),
              ),
            },
          ],
        }
      : {},
  component: TitleLocationsPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundTitle()} />
  ),
});

function TitleLocationsPage() {
  const { data, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language).breadcrumbs;
  const locale = seo.language;
  const items: RailItem[] = data.locations.map((l) => ({
    name: l.placeName,
    href: salaryTitleInLocationPath(data.canonicalSlug, l.placeSlug),
    range: formatRange(locale, l.avgSalaryMin, l.avgSalaryMax),
    jobCount: l.jobCount,
  }));
  const jsonLd = [
    itemListJsonLd(
      data.locations.map((l) => ({
        name: l.placeName,
        url: boardUrl(
          seo.origin,
          salaryTitleInLocationPath(data.canonicalSlug, l.placeSlug),
        ),
      })),
    ),
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
      {
        label: data.categoryName,
        href: boardUrl(seo.origin, salaryTitlePath(data.canonicalSlug)),
      },
      { label: crumbs.locations },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.titles, href: BOARD_PATHS.salaryTitles },
          {
            name: data.categoryName,
            href: salaryTitlePath(data.canonicalSlug),
          },
          { name: crumbs.locations },
        ],
        seo.language,
      )}
      title={m.salaryDetail_titleLocationsHeading({ title: data.categoryName })}
    >
      <JsonLd data={jsonLd} />
      {items.length > 0 ? (
        <SalaryRail
          vm={toSalaryRailVM(
            m.salaryDetail_locationsLabel(),
            items,
            seo.language,
          )}
        />
      ) : (
        <SalaryEmptyState
          title={m.salaryDetail_titleLocationsHeading({
            title: data.categoryName,
          })}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
