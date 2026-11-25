/**
 * `/help/categories/<slug>` — one help category's articles, in the
 * operator's order, a page at a time. An unknown slug is the page's 404.
 */
import {
  createFileRoute,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getHelpCategoryPage } from '../server/help-pages';

import { CursorPagination } from '@/components/board/cursor-pagination';
import { HelpCategoryPage, HelpNotFound } from '@/components/board/help-center';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  cursorPageHref,
  cursorSearchValue,
  type UrlSearchInput,
} from '@/lib/pagination';

interface HelpCategorySearch {
  cursor?: string;
}

export const Route = createFileRoute('/help/categories/$helpCategorySlug')({
  staticData: { fullBleed: true, ownsMain: true, headerSearchScope: 'help' },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: UrlSearchInput): HelpCategorySearch => ({
    cursor: cursorSearchValue(search.cursor),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) =>
    getHelpCategoryPage({
      data: {
        helpCategorySlug: params.helpCategorySlug,
        cursor: deps.cursor,
      },
    }),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CategoryPage,
  notFoundComponent: () => (
    <HelpNotFound
      title={m.helpCategory_notFoundTitle()}
      description={m.help_notFoundDescription()}
      action={{ label: m.help_backLabel(), href: '/help' }}
    />
  ),
});

function CategoryPage() {
  const { category, articles } = Route.useLoaderData();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/help/categories/$helpCategorySlug' });
  const router = useRouter();

  return (
    <HelpCategoryPage
      category={category}
      articles={articles.data}
      // Only a list that fits one page can be counted from what was read.
      articleCount={
        !search.cursor && !articles.hasMore ? articles.data.length : undefined
      }
      listLabel={m.helpCategory_articlesLabel({ category: category.title })}
      pagination={
        <CursorPagination
          hasPrevious={Boolean(search.cursor) && !articles.restarted}
          hasNext={Boolean(articles.hasMore && articles.nextCursor)}
          nextHref={
            articles.nextCursor
              ? cursorPageHref(location.href, articles.nextCursor)
              : undefined
          }
          onPrevious={() => router.history.back()}
          onNext={
            articles.hasMore && articles.nextCursor
              ? () =>
                  navigate({
                    to: '/help/categories/$helpCategorySlug',
                    params: { helpCategorySlug: category.slug },
                    search: { cursor: articles.nextCursor ?? undefined },
                  })
              : undefined
          }
        />
      }
    />
  );
}
