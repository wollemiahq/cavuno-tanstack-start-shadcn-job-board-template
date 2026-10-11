import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { toBlogArticleVM, toBlogPostCardVM } from './blog-view-model';

import type { PublicBlogPost, PublicBlogPostSummary } from '@cavuno/board';

/**
 * The blog mapper is Layer 1b: it resolves the featured flag and its label
 * so the card and the article render the badge from data, not prose.
 */
const summary: PublicBlogPostSummary = {
  id: 'post_1',
  object: 'public_blog_post',
  title: 'Fixture post',
  slug: 'fixture-post',
  featured: true,
  coverUrl: null,
  featureImageAlt: null,
  customExcerpt: null,
  readingTimeMin: 3,
  publishedAt: '2026-06-12T00:00:00.000Z',
  canonicalUrl: null,
  createdAt: '2026-06-10T00:00:00.000Z',
  authors: [],
  tags: [],
};

const article: PublicBlogPost = {
  ...summary,
  featureImageCaption: null,
  html: '<p>Body</p>',
  ogImageUrl: null,
  seoTitle: null,
  seoDescription: null,
  redirected: false,
  newSlug: null,
};

describe('toBlogPostCardVM', () => {
  it('carries the featured flag + the catalog label', () => {
    const vm = toBlogPostCardVM(summary, 'en');
    expect(vm.isFeatured).toBe(true);
    expect(vm.featuredLabel).toBe(m.blogPost_featuredLabel());
  });

  it('is not featured when the post is not', () => {
    expect(
      toBlogPostCardVM({ ...summary, featured: false }, 'en').isFeatured,
    ).toBe(false);
  });
});

describe('toBlogArticleVM', () => {
  it('carries the featured flag + the catalog label', () => {
    const vm = toBlogArticleVM(article, 'en');
    expect(vm.isFeatured).toBe(true);
    expect(vm.featuredLabel).toBe(m.blogPost_featuredLabel());
  });

  it('is not featured when the post is not', () => {
    expect(
      toBlogArticleVM({ ...article, featured: false }, 'en').isFeatured,
    ).toBe(false);
  });
});
