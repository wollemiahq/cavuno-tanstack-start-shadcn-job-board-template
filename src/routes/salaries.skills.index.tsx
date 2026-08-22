/**
 * Head meta + ItemList/Breadcrumb JSON-LD live in getSalarySkillsIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { BOARD_PATHS, salarySkillPath } from '@cavuno/board/paths';
import {
  createFileRoute,
  redirect,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';

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
import { ListingPagination } from '@/components/board/listing-pagination';
import {
  SalaryDirectoryList,
  SalaryEmptyState,
  type RailItem,
} from '@/components/board/salary-sections';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import {
  listingPageHref,
  pageSearchValue,
  parsePageParam,
  totalPages,
} from '@/lib/pagination';

interface SalarySkillsSearch {
  page?: number;
}

export const SALARY_SKILLS_PAGE_SIZE = 50;

export const Route = createFileRoute('/salaries/skills/')({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: Record<string, unknown>): SalarySkillsSearch => ({
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const requestedPage = deps.page ?? 1;
    const pageData = await getSalarySkillsIndexPage({
      data: { page: requestedPage, pageSize: SALARY_SKILLS_PAGE_SIZE },
    });
    const lastPage = Math.max(1, totalPages(pageData.count, pageData.pageSize));

    if (requestedPage > lastPage) {
      throw redirect({
        to: '/salaries/skills',
        search: { page: pageSearchValue(lastPage) },
        replace: true,
      });
    }

    return pageData;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: SalarySkillsIndex,
  pendingComponent: SalaryPendingPage,
});

function SalarySkillsIndex() {
  const { skills, count, page, pageSize } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy();
  const locale = getLocale();
  const location = useLocation();
  const navigate = useNavigate({ from: '/salaries/skills/' });

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
      {count > 0 ? (
        <div data-pagination-scroll-target className="space-y-8">
          <SalaryDirectoryList vm={toSalaryRailVM('', items, getLocale())} />
          <ListingPagination
            page={page}
            count={count}
            pageSize={pageSize}
            hrefForPage={(nextPage) => listingPageHref(location.href, nextPage)}
            onPageChange={(nextPage) =>
              navigate({
                search: (previous) => ({
                  ...previous,
                  page: pageSearchValue(nextPage),
                }),
              })
            }
          />
        </div>
      ) : (
        <SalaryEmptyState
          title={m.salaryHub_skillsEmptyTitle()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
