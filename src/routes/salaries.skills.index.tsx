/**
 * Head meta + ItemList/Breadcrumb JSON-LD live in getSalarySkillsIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { BOARD_PATHS, salarySkillPath } from '@cavuno/board/paths';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSalarySkillsIndexPage } from '../server/salary-pages';
import { SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
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

export const Route = createFileRoute('/salaries/skills/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: () => getSalarySkillsIndexPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: SalarySkillsIndex,
  pendingComponent: SalaryPendingPage,
});

function SalarySkillsIndex() {
  const { skills, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language);
  const locale = getLocale();

  const items: RailItem[] = skills.map((s) => ({
    name: s.name,
    href: salarySkillPath(s.slug),
    range:
      formatSalaryRange(locale, s.avgSalaryMin, s.avgSalaryMax, s.currency) ??
      '',
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
        getLocale(),
      )}
      title={m.salaryHub_skillsHeading()}
    >
      {items.length > 0 ? (
        <SalaryRail vm={toSalaryRailVM('', items, getLocale())} />
      ) : (
        <SalaryEmptyState
          title={m.salaryHub_skillsEmptyTitle()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
