import { isNotFound } from '@cavuno/board';
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
import { createFileRoute, notFound } from '@tanstack/react-router';
import { ImageResponse } from 'workers-og';

import { buildBlogOgHtml, truncate } from '../lib/blog-og';
import { getBoard } from '../lib/board';
import { loadOgFont } from '../lib/og-font';
import { themeTokens } from '../theme/resolved';

export const Route = createFileRoute('/blog/$postSlug/og')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let post;
        try {
          post = await getBoard().blog.posts.retrieve(params.postSlug);
        } catch (error) {
          if (isNotFound(error)) throw notFound();
          throw error;
        }

        // Board language for date formatting — the context read is cached by
        // the SDK client, so this adds no extra request in steady state.
        const [seo, { language }] = await Promise.all([
          getBoard().seo(),
          getBoard().context(),
        ]);
        const author = post.authors[0] ?? null;

        const card = {
          boardName: seo.manifest.name,
          // The accent comes from the repo's canonical theme
          // (resolved tokens), not the wire manifest — one theme source.
          themeColor: themeTokens.light['--primary'] ?? seo.manifest.themeColor,
          title: post.title,
          excerpt: post.customExcerpt,
          authorName: author?.name ?? null,
          authorAvatarUrl: author?.avatarUrl ?? null,
          dateLabel: post.publishedAt
            ? formatDate(language, post.publishedAt)
            : null,
        };

        // Subset the font to exactly the glyphs the card renders (incl. the
        // "· Blog" eyebrow and the "…" truncation marker).
        const text = [
          `${card.boardName} · Blog…`,
          truncate(card.title, 70),
          card.excerpt ? truncate(card.excerpt, 140) : '',
          card.authorName ?? '',
          card.dateLabel ?? '',
        ].join(' ');
        const font = await loadOgFont(text);

        return new ImageResponse(
          buildBlogOgHtml({ ...card, fontFamily: font.name }),
          {
            width: 1200,
            height: 630,
            fonts: [
              {
                name: font.name,
                data: font.data,
                weight: 600,
                style: 'normal',
              },
            ],
          },
        );
      },
    },
  },
});
