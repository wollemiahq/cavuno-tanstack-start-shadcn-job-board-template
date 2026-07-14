import { boardCopy } from '#/copy';
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, listSalarySkills } from '../server/queries';
import { SalaryPageLayout, SalaryPendingPage } from './-salary-page-layout';

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
              title: m.salaryHub_skillsMetaTitle({
                boardName: loaderData.seo.boardName,
              }),
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
              href: `${loaderData.seo.origin}/salaries/skills`,
            },
          ],
        }
      : {},
  component: SalarySkillsIndex,
  pendingComponent: SalaryPendingPage,
});

function SalarySkillsIndex() {
  const { skills, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const locale = seo.language;

  const jsonLd = [
    itemListJsonLd(
      skills.map((s) => ({
        name: s.name,
        url: `${seo.origin}/salaries/skills/${s.slug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: crumbs.skills },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const items: RailItem[] = skills.map((s) => ({
    name: s.name,
    href: `/salaries/skills/${s.slug}`,
    range: formatRange(locale, s.avgSalaryMin, s.avgSalaryMax),
    jobCount: s.jobCount,
  }));

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
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
          title={m.salaryHub_skillsHeading()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
