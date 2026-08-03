/**
 * Head meta + ItemList/Breadcrumb JSON-LD live in getSkillLocationsPage so
 * `@cavuno/board/seo` stays out of the universal client entry.
 */
import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS, salarySkillPath } from '@cavuno/board/paths';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSkillLocationsPage } from '../server/salary-pages';
import { SalaryNotFoundPage, SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
  salarySkillInLocationPath,
  toSalaryBreadcrumbVM,
  toSalaryRailVM,
} from '@/board/salary-view-model';
import {
  SalaryEmptyState,
  SalaryRail,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

export const Route = createFileRoute('/salaries/skills/$slug/locations')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    let page;
    try {
      page = await getSkillLocationsPage({ data: { slug: params.slug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
    if (page.data.canonicalSlug !== params.slug) {
      throw redirect({
        to: '/salaries/skills/$slug/locations',
        params: { slug: page.data.canonicalSlug },
        statusCode: 308,
      });
    }
    return page;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: SkillLocationsPage,
  pendingComponent: SalaryPendingPage,
  notFoundComponent: () => (
    <SalaryNotFoundPage title={m.salaryDetail_notFoundSkill()} />
  ),
});

function SkillLocationsPage() {
  const { data, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language, seo.labels);
  const locale = seo.language;
  const items: RailItem[] = data.locations.map((l) => ({
    name: l.placeName,
    href: salarySkillInLocationPath(data.canonicalSlug, l.placeSlug),
    range: formatSalaryRange(locale, l.avgSalaryMin, l.avgSalaryMax),
    jobCount: l.jobCount,
  }));
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
