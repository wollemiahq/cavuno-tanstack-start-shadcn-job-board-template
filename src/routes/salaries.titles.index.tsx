import { boardCopy } from '#/copy';

import {
  createBreadcrumbJsonLd,
  formatRange,
  itemListJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSeoBase, listSalaryTitles } from '../server/queries';
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
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/salaries/titles/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async () => {
    const [titles, seo] = await Promise.all([listSalaryTitles(), getSeoBase()]);
    return { titles: titles.data, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData?.seo.boardName,
                m.salaryHub_titlesMetaTitle(),
              ),
            },
            {
              name: 'description',
              content: m.salaryHub_titlesMetaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/salaries/titles`,
            },
          ],
        }
      : {},
  component: SalaryTitlesIndex,
  pendingComponent: SalaryPendingPage,
});

function SalaryTitlesIndex() {
  const { titles, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const locale = seo.language;

  const jsonLd = [
    itemListJsonLd(
      titles.map((t) => ({
        name: t.name,
        url: `${seo.origin}/salaries/titles/${t.slug}`,
      })),
    ),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries, href: `${seo.origin}/salaries` },
      { label: m.salaryHub_jobTitlesCrumbLabel() },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const items: RailItem[] = titles.map((t) => ({
    name: t.name,
    href: `/salaries/titles/${t.slug}`,
    range: formatRange(locale, t.avgSalaryMin, t.avgSalaryMax),
    jobCount: t.jobCount,
  }));

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: '/' },
          { name: crumbs.salaries, href: '/salaries' },
          { name: m.salaryHub_jobTitlesCrumbLabel() },
        ],
        seo.language,
        seo.labels,
      )}
      title={m.salaryHub_titlesHeading()}
    >
      <JsonLd data={jsonLd} />
      {items.length > 0 ? (
        <SalaryRail vm={toSalaryRailVM('', items, seo.language, seo.labels)} />
      ) : (
        <SalaryEmptyState
          title={m.salaryHub_titlesHeading()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
