import { formatDate } from '@cavuno/board/format';

import { m } from '../paraglide/messages';

import type { PublicBlogPost, PublicBlogPostSummary } from '@cavuno/board';

/**
 * Blog VIEW-MODEL — the Layer-1b seam for the blog surfaces. The
 * SDK date formatter (`formatDate`) is called ONLY here, so the post card
 * (`PostCard`) and the article (`BlogArticleContent`) render from resolved
 * strings and import nothing from `@cavuno/board*`.
 */

export interface BlogPostCardVM {
  /** Localized published date, or `null` when the post has no publish date. */
  publishedAtLabel: string | null;
  /** The operator marked this post featured in the dashboard. */
  isFeatured: boolean;
  /** Resolved badge text shown when `isFeatured`. */
  featuredLabel: string;
}

/** Resolve a blog-archive card's presentational strings from its summary. */
export function toBlogPostCardVM(
  post: PublicBlogPostSummary,
  language: string,
): BlogPostCardVM {
  return {
    publishedAtLabel: formatDate(language, post.publishedAt),
    isFeatured: post.featured,
    featuredLabel: m.blogPost_featuredLabel(),
  };
}

export interface BlogArticleVM {
  /** Localized published date, or `null` when the post has no publish date. */
  publishedAtLabel: string | null;
  /** The operator marked this post featured in the dashboard. */
  isFeatured: boolean;
  /** Resolved badge text shown when `isFeatured`. */
  featuredLabel: string;
}

/** Resolve a blog article's presentational strings from the full post. */
export function toBlogArticleVM(
  post: PublicBlogPost,
  language: string,
): BlogArticleVM {
  return {
    publishedAtLabel: formatDate(language, post.publishedAt),
    isFeatured: post.featured,
    featuredLabel: m.blogPost_featuredLabel(),
  };
}
