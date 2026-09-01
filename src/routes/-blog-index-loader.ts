import { notFound } from '@tanstack/react-router';

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
  isBlogEnabled: () => Promise<boolean> = async () => true,
) {
  return async ({ deps }: { deps: BlogSearch }) => {
    if (!(await isBlogEnabled())) throw notFound();
    return loadPage({ data: { cursor: deps.cursor, q: deps.q } });
  };
}
