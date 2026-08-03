import { BOARD_PATHS, boardUrl, companySalaryPath } from '@cavuno/board/paths';
import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, listSalaryCompanies } from '../server/queries';
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

export const Route = createFileRoute('/salaries/companies/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async () => {
    const [companies, seo] = await Promise.all([
      listSalaryCompanies(),
      getSeoBase(),
    ]);
    return { companies: companies.data, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData?.seo.boardName,
                m.salaryHub_companiesMetaTitle(),
              ),
            },
            {
              name: 'description',
              content: m.salaryHub_companiesMetaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                BOARD_PATHS.salaryCompanies,
              ),
            },
          ],
        }
      : {},
  component: SalaryCompaniesIndex,
  pendingComponent: SalaryPendingPage,
});

function SalaryCompaniesIndex() {
  const { companies, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language, seo.labels);
  const locale = seo.language;

  const jsonLd = [
    itemListJsonLd(
      companies.map((c) => ({
        name: c.companyName,
        url: boardUrl(seo.origin, companySalaryPath(c.companySlug)),
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      {
        label: crumbs.salaries,
        href: boardUrl(seo.origin, BOARD_PATHS.salaries),
      },
      { label: crumbs.companies },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const items: RailItem[] = companies.map((c) => ({
    name: c.companyName,
    href: companySalaryPath(c.companySlug),
    range: formatRange(locale, c.avgSalaryMin, c.avgSalaryMax),
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
        seo.labels,
      )}
      title={m.salaryHub_companiesHeading()}
    >
      <JsonLd data={jsonLd} />
      {items.length > 0 ? (
        <SalaryRail vm={toSalaryRailVM('', items, seo.language, seo.labels)} />
      ) : (
        <SalaryEmptyState
          title={m.salaryHub_companiesHeading()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
