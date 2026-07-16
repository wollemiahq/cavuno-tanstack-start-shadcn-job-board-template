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

import { BlogArticleContent } from './blog-article-content';

import type { PublicBlogPost } from '@cavuno/board';

const authorName =
  'Avery Montgomery-Smythe, Principal Editorial Research Fellow';

const post = {
  id: 'post-one',
  object: 'public_blog_post',
  title: 'A complete field guide to resilient design-system governance',
  slug: 'resilient-design-system-governance',
  featured: true,
  coverUrl: 'https://cdn.example.com/governance.jpg',
  featureImageAlt: 'Design-system maintainers reviewing a component map',
  featureImageCaption:
    'The maintainers trace one component from shared token to product pattern.',
  customExcerpt:
    'How a mature team keeps decisions legible without slowing delivery.',
  readingTimeMin: 14,
  publishedAt: '2026-06-12T00:00:00.000Z',
  canonicalUrl: null,
  createdAt: '2026-06-10T00:00:00.000Z',
  html: '<h2>Start with the decision boundary</h2><p>Record what can change and who decides.</p>',
  ogImageUrl: null,
  seoTitle: null,
  seoDescription: null,
  redirected: false,
  newSlug: null,
  authors: [
    {
      id: 'author-avery',
      name: authorName,
      slug: 'avery-montgomery-smythe',
      bio: 'Documents the operating systems behind durable product teams.',
      avatarUrl: null,
      websiteUrl: 'https://avery.example',
      twitterUrl: 'https://x.com/avery',
      linkedinUrl: 'https://www.linkedin.com/in/avery',
      githubUrl: 'https://github.com/avery',
    },
  ],
  tags: [
    {
      id: 'tag-governance',
      name: 'Design-system governance across international product portfolios',
      slug: 'design-system-governance',
      description: null,
    },
  ],
} satisfies PublicBlogPost;

const missingBody = {
  title: 'This article has no published body',
  description: 'The article record exists, but its content is not available.',
  action: { label: 'Back to the blog', href: '/blog' },
};

afterEach(cleanup);

function renderArticle(article: PublicBlogPost) {
  const rootRoute = createRootRoute({
    loader: () => ({ board: { language: 'en' } }),
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <BlogArticleContent
        breadcrumb={{
          ariaLabel: 'Breadcrumb',
          items: [
            { name: 'Home', href: '/' },
            { name: 'Blog', href: '/blog' },
            { name: article.title },
          ],
        }}
        post={article}
        language="en"
        permalink={`https://jobs.example/blog/${article.slug}`}
        missingBody={missingBody}
      />
    ),
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
      route('/blog/tag/$tagSlug'),
      route('/blog/author/$authorSlug'),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('BlogArticleContent — complete article presentation', () => {
  it('uses the Page family, Typeset body, captioned image, and an author byline that defers social links to the author page', async () => {
    const { container } = renderArticle(post);

    const main = await screen.findByRole('main');
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(main).toContainElement(
      screen.getByRole('heading', { level: 1, name: post.title }),
    );

    const body = screen.getByLabelText('Article body');
    expect(body).toHaveClass('typeset', 'typeset-content');
    expect(body).toHaveTextContent('Record what can change and who decides.');
    const cover = screen.getByRole('img', { name: post.featureImageAlt! });
    expect(cover).toBeVisible();
    expect(cover).toHaveAttribute('width', '1200');
    expect(cover).toHaveAttribute('height', '675');
    expect(cover).toHaveAttribute('fetchpriority', 'high');
    expect(
      screen.getByText(
        'The maintainers trace one component from shared token to product pattern.',
      ).tagName,
    ).toBe('FIGCAPTION');

    const [author] = screen.getAllByRole('link', { name: authorName });
    expect(author).toBeDefined();
    expect(author).toHaveAttribute(
      'href',
      '/blog/author/avery-montgomery-smythe',
    );
    expect(author).toHaveTextContent(authorName);
    // The author's own social links belong to the author page, not each post —
    // the byline here links through to that profile instead.
    expect(
      container.querySelector('a[href="https://avery.example"]'),
    ).toBeNull();
    expect(container.querySelector('a[href="https://x.com/avery"]')).toBeNull();
    expect(
      container.querySelector('a[href="https://www.linkedin.com/in/avery"]'),
    ).toBeNull();
    expect(
      container.querySelector('a[href="https://github.com/avery"]'),
    ).toBeNull();
    expect(
      screen.getByRole('link', {
        name: 'Design-system governance across international product portfolios',
      }),
    ).toHaveAttribute('href', '/blog/tag/design-system-governance');
  });

  it('does not turn a null API body into a blank article', async () => {
    renderArticle({ ...post, html: null });

    expect(
      await screen.findByRole('heading', {
        name: 'This article has no published body',
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'The article record exists, but its content is not available.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Back to the blog' }),
    ).toHaveAttribute('href', '/blog');
    expect(screen.queryByLabelText('Article body')).toBeNull();
  });
});
