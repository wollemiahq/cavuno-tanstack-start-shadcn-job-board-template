// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BlogArchivePage } from './blog-archive-page';

import type { PublicBlogPostSummary } from '@cavuno/board';

const post = {
  id: 'post-one',
  object: 'public_blog_post',
  title: 'Design-system decisions that survive product growth',
  slug: 'design-system-decisions',
  featured: false,
  coverUrl: null,
  featureImageAlt: null,
  customExcerpt: 'A complete account of the decisions and their trade-offs.',
  readingTimeMin: 11,
  publishedAt: '2026-06-12T00:00:00.000Z',
  canonicalUrl: null,
  createdAt: '2026-06-10T00:00:00.000Z',
  authors: [
    {
      id: 'author-avery',
      name: 'Avery Montgomery-Smythe, Principal Editorial Research Fellow',
      slug: 'avery-montgomery-smythe',
      bio: null,
      avatarUrl: null,
      websiteUrl: null,
      twitterUrl: null,
      linkedinUrl: null,
      githubUrl: null,
    },
  ],
  tags: [
    {
      id: 'tag-design-systems',
      name: 'Design systems for international multi-product organizations',
      slug: 'design-systems',
      description: null,
    },
  ],
} satisfies PublicBlogPostSummary;

const breadcrumb = {
  ariaLabel: 'Breadcrumb',
  items: [{ name: 'Home', href: '/' }, { name: 'Blog' }],
};

const empty = {
  title: 'No articles found',
  description: 'There are no published articles in this archive yet.',
  action: { label: 'Browse every article', href: '/blog' },
};

afterEach(cleanup);

function renderArchive(element: React.ReactNode) {
  const rootRoute = createRootRoute({
    loader: () => ({ board: { language: 'en' } }),
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => element,
  });
  const route = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      route('/blog'),
      route('/blog/$postSlug'),
      route('/blog/tag/$tagSlug'),
      route('/blog/author/$authorSlug'),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('BlogArchivePage — Page-family archive presentation', () => {
  it('owns one main and h1 while preserving real discovery and cursor anchors', async () => {
    const { container } = renderArchive(
      <BlogArchivePage
        breadcrumb={breadcrumb}
        title="Research and field notes for international design-system teams"
        description="Long-form practical guidance from the people doing the work."
        filters={
          <nav aria-label="Article topics">
            <a href="/blog/tag/design-systems">
              Design systems for international multi-product organizations
            </a>
          </nav>
        }
        search={
          <form aria-label="Search articles">
            <input type="search" />
          </form>
        }
        posts={[post]}
        empty={empty}
        nextLink={<a href="/blog?cursor=opaque%3Apage%3A2">Next results</a>}
      />,
    );

    const main = await screen.findByRole('main');
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(
      within(main).getByRole('heading', {
        level: 1,
        name: 'Research and field notes for international design-system teams',
      }),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole('navigation', { name: 'Article topics' }),
      ).getByRole('link', {
        name: 'Design systems for international multi-product organizations',
      }),
    ).toHaveAttribute('href', '/blog/tag/design-systems');
    expect(
      screen.getByRole('link', {
        name: /Design-system decisions that survive product growth/i,
      }),
    ).toHaveAttribute('href', '/blog/design-system-decisions');
    expect(screen.getByRole('link', { name: 'Next results' })).toHaveAttribute(
      'href',
      '/blog?cursor=opaque%3Apage%3A2',
    );
    expect(
      screen
        .getByRole('link', { name: 'Next results' })
        .closest('[data-slot="pagination"]'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Next results' })).toBeNull();
  });

  it('explains an empty archive and gives the visitor a crawlable recovery path', async () => {
    renderArchive(
      <BlogArchivePage
        breadcrumb={breadcrumb}
        title="A topic with no published articles"
        posts={[]}
        empty={empty}
      />,
    );

    expect(await screen.findByText('No articles found')).toBeVisible();
    expect(
      screen.getByText('There are no published articles in this archive yet.'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Browse every article' }),
    ).toHaveAttribute('href', '/blog');
  });
});
