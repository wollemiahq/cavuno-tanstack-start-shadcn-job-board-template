// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PostCard } from './post-card';

import type { PublicBlogPostSummary } from '@cavuno/board';

const longAuthorName =
  'Avery Montgomery-Smythe, Principal Editorial Research Fellow';

const post = {
  id: 'post-design-systems',
  object: 'public_blog_post',
  title: 'A practical field guide to durable design systems',
  slug: 'durable-design-systems',
  featured: false,
  coverUrl: 'https://cdn.example.com/design-systems.jpg',
  featureImageAlt: 'A wall covered in connected component diagrams',
  customExcerpt: 'How product teams keep shared UI coherent as they grow.',
  readingTimeMin: 9,
  publishedAt: '2026-06-12T00:00:00.000Z',
  canonicalUrl: null,
  createdAt: '2026-06-10T00:00:00.000Z',
  authors: [
    {
      id: 'author-avery',
      name: longAuthorName,
      slug: 'avery-montgomery-smythe',
      bio: null,
      location: null,
      avatarUrl: null,
      websiteUrl: null,
      facebookUrl: null,
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

afterEach(cleanup);

function renderCard(priority = false) {
  const rootRoute = createRootRoute({
    loader: () => ({ board: { language: 'en' } }),
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <PostCard post={post} priority={priority} />,
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
      route('/blog/$postSlug'),
      route('/blog/tag/$tagSlug'),
      route('/blog/author/$authorSlug'),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('PostCard — crawlable blog discovery', () => {
  it('keeps the post, first tag, and author as complete crawlable links', async () => {
    renderCard();

    expect(
      await screen.findByRole('link', {
        name: /A practical field guide to durable design systems/i,
      }),
    ).toHaveAttribute('href', '/blog/durable-design-systems');
    expect(
      screen.getByRole('link', {
        name: 'Design systems for international multi-product organizations',
      }),
    ).toHaveAttribute('href', '/blog/tag/design-systems');

    const author = screen.getByRole('link', { name: longAuthorName });
    expect(author).toHaveAttribute(
      'href',
      '/blog/author/avery-montgomery-smythe',
    );
    expect(author).toHaveTextContent(longAuthorName);

    const cover = screen.getByRole('img', {
      name: post.featureImageAlt!,
    });
    expect(cover).toHaveAttribute('width', '1200');
    expect(cover).toHaveAttribute('height', '675');
    // Default: below-fold cards stay lazy.
    expect(cover).toHaveAttribute('loading', 'lazy');
    expect(cover).not.toHaveAttribute('fetchpriority');
  });

  it('marks a priority cover as eager + high fetch priority for LCP', async () => {
    renderCard(true);

    const cover = await screen.findByRole('img', {
      name: post.featureImageAlt!,
    });
    expect(cover).toHaveAttribute('loading', 'eager');
    expect(cover).toHaveAttribute('fetchpriority', 'high');
  });
});
