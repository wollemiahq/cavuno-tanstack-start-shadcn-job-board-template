/**
 * Head meta + ItemList/Breadcrumb JSON-LD live in getSalaryTitlesIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { BOARD_PATHS, salaryTitlePath } from '@cavuno/board/paths';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSalaryTitlesIndexPage } from '../server/salary-pages';
import { SalaryPageLayout } from './-salary-page-layout';
import { SalaryPendingPage } from './-salary-pending-page';

import {
  formatSalaryRange,
  toSalaryBreadcrumbVM,
  toSalaryRailVM,
} from '@/board/salary-view-model';
import {
  SalaryDirectoryList,
  SalaryEmptyState,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

export const Route = createFileRoute('/salaries/titles/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: () => getSalaryTitlesIndexPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: SalaryTitlesIndex,
  pendingComponent: SalaryPendingPage,
});

function SalaryTitlesIndex() {
  const { titles } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy();
  const locale = getLocale();

  const items: RailItem[] = titles.map((t) => ({
    name: t.name,
    href: salaryTitlePath(t.slug),
    range:
      formatSalaryRange(locale, t.avgSalaryMin, t.avgSalaryMax, t.currency) ??
      '',
    jobCount: t.jobCount,
  }));

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: m.salaryHub_jobTitlesCrumbLabel() },
        ],
        getLocale(),
      )}
      title={m.salaryHub_titlesHeading()}
    >
      {items.length > 0 ? (
        <SalaryDirectoryList vm={toSalaryRailVM('', items, getLocale())} />
      ) : (
        <SalaryEmptyState
          title={m.salaryHub_titlesEmptyTitle()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
