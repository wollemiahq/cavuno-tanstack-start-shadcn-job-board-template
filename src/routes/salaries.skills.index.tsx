import { BOARD_PATHS, boardUrl, salarySkillPath } from '@cavuno/board/paths';
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, listSalarySkills } from '../server/queries';
import { SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

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
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/salaries/skills/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async () => {
    const [skills, seo] = await Promise.all([listSalarySkills(), getSeoBase()]);
    return { skills: skills.data, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData?.seo.boardName,
                m.salaryHub_skillsMetaTitle(),
              ),
            },
            {
              name: 'description',
              content: m.salaryHub_skillsMetaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(loaderData.seo.origin, BOARD_PATHS.salarySkills),
            },
          ],
        }
      : {},
  component: SalarySkillsIndex,
  pendingComponent: SalaryPendingPage,
});

function SalarySkillsIndex() {
  const { skills, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language, seo.labels);
  const locale = seo.language;

  const jsonLd = [
    itemListJsonLd(
      skills.map((s) => ({
        name: s.name,
        url: boardUrl(seo.origin, salarySkillPath(s.slug)),
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      {
        label: crumbs.salaries,
        href: boardUrl(seo.origin, BOARD_PATHS.salaries),
      },
      { label: crumbs.skills },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const items: RailItem[] = skills.map((s) => ({
    name: s.name,
    href: salarySkillPath(s.slug),
    range: formatRange(locale, s.avgSalaryMin, s.avgSalaryMax),
    jobCount: s.jobCount,
  }));

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.skills },
        ],
        seo.language,
        seo.labels,
      )}
      title={m.salaryHub_skillsHeading()}
    >
      <JsonLd data={jsonLd} />
      {items.length > 0 ? (
        <SalaryRail vm={toSalaryRailVM('', items, seo.language, seo.labels)} />
      ) : (
        <SalaryEmptyState
          title={m.salaryHub_skillsEmptyTitle()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
