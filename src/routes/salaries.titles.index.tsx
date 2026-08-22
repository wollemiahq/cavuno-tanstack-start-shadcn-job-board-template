/**
 * Head meta + ItemList/Breadcrumb JSON-LD live in getSalaryTitlesIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { BOARD_PATHS, salaryTitlePath } from '@cavuno/board/paths';
import {
  createFileRoute,
  redirect,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';

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

interface SalaryTitlesSearch {
  page?: number;
}

export const SALARY_TITLES_PAGE_SIZE = 50;

export const Route = createFileRoute('/salaries/titles/')({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: Record<string, unknown>): SalaryTitlesSearch => ({
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const requestedPage = deps.page ?? 1;
    const pageData = await getSalaryTitlesIndexPage({
      data: { page: requestedPage, pageSize: SALARY_TITLES_PAGE_SIZE },
    });
    const lastPage = Math.max(1, totalPages(pageData.count, pageData.pageSize));

    if (requestedPage > lastPage) {
      throw redirect({
        to: '/salaries/titles',
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
  component: SalaryTitlesIndex,
  pendingComponent: SalaryPendingPage,
});

function SalaryTitlesIndex() {
  const { titles, count, page, pageSize } = Route.useLoaderData();
  const crumbs = breadcrumbsCopy();
  const locale = getLocale();
  const location = useLocation();
  const navigate = useNavigate({ from: '/salaries/titles/' });

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
          title={m.salaryHub_titlesEmptyTitle()}
          description={m.salaryHub_emptyDescription()}
        />
      )}
    </SalaryPageLayout>
  );
}
