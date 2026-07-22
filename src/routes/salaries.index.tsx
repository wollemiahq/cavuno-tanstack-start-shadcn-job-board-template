import { boardCopy } from '#/copy';

import {
  BOARD_PATHS,
  boardUrl,
  companySalaryPath,
  salaryLocationPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import { createBreadcrumbJsonLd, formatRange } from '@cavuno/board/seo';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  getSeoBase,
  listSalaryCompanies,
  listSalaryLocations,
  listSalarySkills,
  listSalaryTitles,
} from '../server/queries';
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
import { PageSection } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';

const PREVIEW = 9;

export const Route = createFileRoute('/salaries/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async () => {
    const [companies, titles, skills, locations, seo] = await Promise.all([
      listSalaryCompanies(),
      listSalaryTitles(),
      listSalarySkills(),
      listSalaryLocations(),
      getSeoBase(),
    ]);
    return {
      companies: companies.data,
      titles: titles.data,
      skills: skills.data,
      // Top-level places only (the hub preview); the index page shows the tree.
      locations: locations.data.filter((l) => l.parentSlug === null),
      seo,
    };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData?.seo.boardName,
                m.salaryHub_metaTitle(),
              ),
            },
            {
              name: 'description',
              content: m.salaryHub_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(loaderData.seo.origin, BOARD_PATHS.salaries),
            },
          ],
        }
      : {},
  component: SalariesHub,
  pendingComponent: SalaryPendingPage,
});

function SalariesHub() {
  const { companies, titles, skills, locations, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const locale = seo.language;

  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.salaries },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  const companyItems: RailItem[] = companies.slice(0, PREVIEW).map((x) => ({
    name: x.companyName,
    href: companySalaryPath(x.companySlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }));
  const titleItems: RailItem[] = titles.slice(0, PREVIEW).map((x) => ({
    name: x.name,
    href: salaryTitlePath(x.slug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const skillItems: RailItem[] = skills.slice(0, PREVIEW).map((x) => ({
    name: x.name,
    href: salarySkillPath(x.slug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const locationItems: RailItem[] = locations.slice(0, PREVIEW).map((x) => ({
    name: x.placeName,
    href: salaryLocationPath(x.placeSlug),
    range: formatRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const hasSalaryData =
    companyItems.length +
      titleItems.length +
      skillItems.length +
      locationItems.length >
    0;

  return (
    <SalaryPageLayout
      breadcrumb={toSalaryBreadcrumbVM(
        [
          { name: crumbs.home, href: BOARD_PATHS.home },
          { name: crumbs.salaries },
        ],
        seo.language,
        seo.labels,
      )}
      title={crumbs.salaries}
      description={m.salaryHub_subheading()}
    >
      <JsonLd data={jsonLd} />
      {hasSalaryData ? (
        <>
          <HubSection
            title={crumbs.companies}
            seeAll={BOARD_PATHS.salaryCompanies}
            items={companyItems}
            seo={seo}
          />
          <HubSection
            title={crumbs.titles}
            seeAll={BOARD_PATHS.salaryTitles}
            items={titleItems}
            seo={seo}
          />
          <HubSection
            title={crumbs.skills}
            seeAll={BOARD_PATHS.salarySkills}
            items={skillItems}
            seo={seo}
          />
          <HubSection
            title={crumbs.locations}
            seeAll={BOARD_PATHS.salaryLocations}
            items={locationItems}
            seo={seo}
          />
        </>
      ) : (
        <SalaryEmptyState
          title={crumbs.salaries}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}

function HubSection({
  title,
  seeAll,
  items,
  seo,
}: {
  title: string;
  seeAll: string;
  items: RailItem[];
  seo: { language: string; labels: Record<string, Record<string, string>> };
}) {
  if (items.length === 0) return null;
  return (
    <PageSection
      title={title}
      actions={
        <a
          href={seeAll}
          className={buttonVariants({ variant: 'link', size: 'sm' })}
        >
          {m.salaryHub_seeAllLabel()}
        </a>
      }
    >
      <SalaryRail vm={toSalaryRailVM('', items, seo.language, seo.labels)} />
    </PageSection>
  );
}
