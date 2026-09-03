import { formatDate } from '@cavuno/board/format';
/**
 * Open Graph image — 1200×630 card for a blog post, the starter's counterpart
 * to the hosted `…/blog/:slug/og` route (a `@takumi-rs` ImageResponse). As with
 * the job-detail OG route the two renderers can't be pixel-identical, so the
 * parity bar is content + dimensions: same card, same info (board · Blog · title
 * · excerpt · author · date). Rendered in the Worker runtime via `workers-og`.
 *
 * The card markup lives in `lib/blog-og.ts` (unit-tested); this route only
 * fetches the data, subsets the font, and returns the image.
 */
import { createFileRoute } from '@tanstack/react-router';

import { blogDisabledResponse, isBlogEnabled } from '../lib/blog-enabled';
import { buildBlogOgHtml, truncate } from '../lib/blog-og';
import { getBoard } from '../lib/board';
import { readBoardContext } from '../lib/board-context-cache';
import { loadOgFont } from '../lib/og-font';
import { ogNotFoundResponse, ogUnavailableResponse } from '../lib/og-http';
import { ogImageSrc } from '../lib/og-image';
import { renderOgPng } from '../lib/og-render';
import { ogThemeTokens } from '../lib/og-theme';
import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';

type Post = Awaited<
  ReturnType<ReturnType<typeof getBoard>['blog']['posts']['retrieve']>
>;

export const Route = createFileRoute('/blog/$postSlug/og')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // A blog-off board has no post pages, so it has no post share cards.
        if (!(await isBlogEnabled().catch(() => false))) {
          return blogDisabledResponse();
        }

        let post;
        try {
          post = await getBoard().blog.posts.retrieve(params.postSlug);
        } catch {
          return ogNotFoundResponse();
        }

        // Everything after the slug resolved is renderer plumbing (SEO name,
        // board language, font subset, satori). Any fault there is a 503 —
        // never an unhandled 500 — because the slug is known to exist.
        try {
          return await renderBlogOg(post);
        } catch (error) {
          // Tenant Workers log to Cloudflare observability; without this line
          // a renderer fault is invisible (see og-render.ts).
          console.error('[og] blog card render failed', error);
          return ogUnavailableResponse();
        }
      },
    },
  },
});

async function renderBlogOg(post: Post): Promise<Response> {
  // Board language for date formatting — served from the isolate context
  // memo / edge cache, so this adds no extra request in steady state.
  const [seo, { language }] = await Promise.all([
    getBoard().seo(),
    readBoardContext(),
  ]);
  const author = post.authors[0] ?? null;

  const card = {
    boardName: seo.manifest.name,
    // Board-language "Blog" word — the eyebrow must not be English on
    // a non-English board's share card.
    blogLabel: m.nav_blog(
      {},
      isLocale(language) ? { locale: language } : undefined,
    ),
    // The accent comes from the repo's canonical theme (resolved tokens,
    // converted to sRGB for Satori), not the wire manifest — one theme source.
    themeColor: ogThemeTokens()['--primary'],
    title: post.title,
    excerpt: post.customExcerpt,
    authorName: author?.name ?? null,
    dateLabel: post.publishedAt ? formatDate(language, post.publishedAt) : null,
  };

  // Subset the font to exactly the glyphs the card renders (incl. the
  // "· Blog" eyebrow and the "…" truncation marker).
  const text = [
    `${card.boardName} · ${card.blogLabel}…`,
    truncate(card.title, 70),
    card.excerpt ? truncate(card.excerpt, 140) : '',
    card.authorName ?? '',
    card.dateLabel ?? '',
  ].join(' ');
  // The avatar contributes no glyphs, so it resolves alongside the font
  // rather than delaying it. `null` drops the avatar frame (see og-image.ts).
  const [font, authorAvatarUrl] = await Promise.all([
    loadOgFont(text),
    ogImageSrc(author?.avatarUrl),
  ]);

  return renderOgPng(
    buildBlogOgHtml({ ...card, authorAvatarUrl, fontFamily: font.name }),
    font,
  );
}
