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
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlogArchivePage } from './blog-archive-page';
import { CursorPagination } from './cursor-pagination';

import { m } from '@/paraglide/messages';
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
  it('keeps the root archive compact without a visible breadcrumb', async () => {
    const { container } = renderArchive(
      <BlogArchivePage
        title="Blog"
        description="News and insights."
        filters={<nav aria-label="Article topics">All topics</nav>}
        posts={[post]}
        empty={empty}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Blog' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
    expect(
      screen
        .getByRole('navigation', { name: 'Article topics' })
        .closest('[data-slot="page-header"]'),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '[data-slot="page-content"] > [data-slot="container"]',
      ),
    ).toBeNull();
  });

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
        pagination={
          <CursorPagination
            hasPrevious
            hasNext
            nextHref="/blog?cursor=opaque%3Apage%3A2"
            onPrevious={vi.fn()}
            onNext={vi.fn()}
          />
        }
      />,
    );

    const main = await screen.findByRole('main');
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
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
    // The blog SDK surface is cursor-only, so the archive paginates by opaque
    // cursor: the Next control stays a real crawlable anchor (SEO), rendered on
    // the shared design-system pagination primitive.
    const next = screen.getByRole('link', {
      name: m.pagination_nextPageLabel(),
    });
    expect(next).toHaveAttribute('href', '/blog?cursor=opaque%3Apage%3A2');
    expect(next.closest('[data-slot="pagination"]')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: m.pagination_nextPageLabel() }),
    ).toBeNull();
    expect(
      screen.getByRole('link', { name: m.pagination_previousPageLabel() }),
    ).toBeVisible();
  });

  it('leads the h1 with a decorative avatar without polluting the heading name', async () => {
    const { container } = renderArchive(
      <BlogArchivePage
        breadcrumb={breadcrumb}
        title="Harriet Vale"
        description="Writes about hiring systems and editorial operations."
        avatar={
          <span aria-hidden data-slot="avatar">
            HV
          </span>
        }
        filters={
          <div>
            <a href="https://example.com/in/harriet">LinkedIn</a>
          </div>
        }
        posts={[post]}
        empty={empty}
      />,
    );

    // Single h1 whose accessible name is just the author, avatar excluded.
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Harriet Vale',
    });
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    // The avatar renders inside the heading, ahead of the name.
    expect(heading.querySelector('[data-slot="avatar"]')).not.toBeNull();
    // The bio is the description line, the social link a quiet affordance below.
    expect(
      screen.getByText(
        'Writes about hiring systems and editorial operations.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://example.com/in/harriet',
    );
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
