import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
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
              content: m.salaryDetail_skillLocationsMetaDescription({
                skill: loaderData.data.skillName,
                count: loaderData.data.locations.length,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/skills/${loaderData.data.canonicalSlug}/locations`,
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
    href: `/salaries/skills/${data.canonicalSlug}/${l.placeSlug}`,
    range: formatRange(locale, l.avgSalaryMin, l.avgSalaryMax),
    jobCount: l.jobCount,
  }));
  const jsonLd = [
    itemListJsonLd(
      data.locations.map((l) => ({
        name: l.placeName,
        url: `${seo.origin}/salaries/skills/${data.canonicalSlug}/${l.placeSlug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.skills, href: `${seo.origin}/salaries/skills` },
      {
        label: data.skillName,
        href: `${seo.origin}/salaries/skills/${data.canonicalSlug}`,
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
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: crumbs.skills, href: '/salaries/skills' },
          {
            name: data.skillName,
            href: `/salaries/skills/${data.canonicalSlug}`,
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
