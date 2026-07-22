import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS, boardUrl, salarySkillPath } from '@cavuno/board/paths';
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, getSkillLocations } from '../server/queries';
import {
  SalaryNotFoundPage,
  SalaryPageLayout,
  SalaryPendingPage,
} from './-salary-page-layout';

import {
  salarySkillInLocationPath,
  salarySkillLocationsPath,
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

export const Route = createFileRoute('/salaries/skills/$slug/locations')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let data;
    try {
      data = await getSkillLocations({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (data.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/skills/$slug/locations',
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
                m.salaryDetail_skillLocationsMetaTitle({
                  skill: loaderData.data.skillName,
                }),
              ),
            },
            {
              name: 'description',
              content:
                loaderData.data.locations.length === 1
                  ? m.salaryDetail_skillLocationsMetaDescriptionOne({
                      skill: loaderData.data.skillName,
                      count: loaderData.data.locations.length,
                    })
                  : m.salaryDetail_skillLocationsMetaDescriptionMany({
                      skill: loaderData.data.skillName,
                      count: loaderData.data.locations.length,
                    }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                salarySkillLocationsPath(loaderData.data.canonicalSlug),
              ),
            },
          ],
        }
      : {},
  component: SkillLocationsPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundSkill()} />
  ),
});

function SkillLocationsPage() {
  const { data, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const locale = seo.language;
  const items: RailItem[] = data.locations.map((l) => ({
    name: l.placeName,
    href: salarySkillInLocationPath(data.canonicalSlug, l.placeSlug),
    range: formatRange(locale, l.avgSalaryMin, l.avgSalaryMax),
    jobCount: l.jobCount,
  }));
  const jsonLd = [
    itemListJsonLd(
      data.locations.map((l) => ({
        name: l.placeName,
        url: boardUrl(
          seo.origin,
          salarySkillInLocationPath(data.canonicalSlug, l.placeSlug),
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
        label: crumbs.skills,
        href: boardUrl(seo.origin, BOARD_PATHS.salarySkills),
      },
      {
        label: data.skillName,
        href: boardUrl(seo.origin, salarySkillPath(data.canonicalSlug)),
      },
      { label: crumbs.locations },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);
  const heading = m.salaryDetail_skillLocationsHeading({
    skill: data.skillName,
  });

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.skills, href: BOARD_PATHS.salarySkills },
          {
            name: data.skillName,
            href: salarySkillPath(data.canonicalSlug),
          },
          { name: crumbs.locations },
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
            m.salaryDetail_locationsLabel(),
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
