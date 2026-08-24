import { getBlogIndexPage } from '@/server/blog-pages';

export interface BlogSearch {
  cursor?: string;
  q?: string;
}

export type BlogIndexPageLoader = (options: {
  data: { cursor?: string; q?: string };
}) => ReturnType<typeof getBlogIndexPage>;

export function createBlogIndexLoader(
  loadPage: BlogIndexPageLoader = getBlogIndexPage,
) {
  return async ({ deps }: { deps: BlogSearch }) =>
    loadPage({ data: { cursor: deps.cursor, q: deps.q } });
}
