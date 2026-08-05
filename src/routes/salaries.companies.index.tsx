/**
 * Head meta + ItemList/Breadcrumb JSON-LD live in getSalaryCompaniesIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { BOARD_PATHS, companySalaryPath } from '@cavuno/board/paths';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSalaryCompaniesIndexPage } from '../server/salary-pages';
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

export const Route = createFileRoute('/salaries/companies/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: () => getSalaryCompaniesIndexPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: SalaryCompaniesIndex,
  pendingComponent: SalaryPendingPage,
});

function SalaryCompaniesIndex() {
  const { companies, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language);
  const locale = seo.language;

  const items: RailItem[] = companies.map((c) => ({
    name: c.companyName,
    href: companySalaryPath(c.companySlug),
    range:
      formatSalaryRange(locale, c.avgSalaryMin, c.avgSalaryMax, c.currency) ??
      '',
    jobCount: c.jobCount,
    logoPath: c.logoPath,
  }));

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries, href: BOARD_PATHS.salaries },
          { name: crumbs.companies },
        ],
        seo.language,
      )}
      title={m.salaryHub_companiesHeading()}
    >
      {items.length > 0 ? (
        <SalaryRail vm={toSalaryRailVM('', items, seo.language)} />
      ) : (
        <SalaryEmptyState
          title={m.salaryHub_companiesHeading()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
