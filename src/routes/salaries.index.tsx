/**
 * Salary hub — data + head + breadcrumb JSON-LD come from getSalaryHubPage so
 * `@cavuno/board/seo` stays out of the universal client entry.
 */
import {
  BOARD_PATHS,
  companySalaryPath,
  salaryLocationPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSalaryHubPage } from '../server/salary-pages';
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
import { PageSection } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

const PREVIEW = 9;

export const Route = createFileRoute('/salaries/')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: () => getSalaryHubPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: SalariesHub,
  pendingComponent: SalaryPendingPage,
});

function SalariesHub() {
  const { companies, titles, skills, locations, seo } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy(seo.language, seo.labels);
  const locale = seo.language;

  const companyItems: RailItem[] = companies.slice(0, PREVIEW).map((x) => ({
    name: x.companyName,
    href: companySalaryPath(x.companySlug),
    range: formatSalaryRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
    logoPath: x.logoPath,
  }));
  const titleItems: RailItem[] = titles.slice(0, PREVIEW).map((x) => ({
    name: x.name,
    href: salaryTitlePath(x.slug),
    range: formatSalaryRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const skillItems: RailItem[] = skills.slice(0, PREVIEW).map((x) => ({
    name: x.name,
    href: salarySkillPath(x.slug),
    range: formatSalaryRange(locale, x.avgSalaryMin, x.avgSalaryMax),
    jobCount: x.jobCount,
  }));
  const locationItems: RailItem[] = locations.slice(0, PREVIEW).map((x) => ({
    name: x.placeName,
    href: salaryLocationPath(x.placeSlug),
    range: formatSalaryRange(locale, x.avgSalaryMin, x.avgSalaryMax),
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
