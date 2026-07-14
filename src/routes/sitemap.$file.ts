import {
  SITEMAP_CHUNK_SIZE,
  buildBucketUrls,
  chunk,
  parseBucketFilename,
  renderUrlset,
} from '@cavuno/board/sitemap';
/**
 * Sub-sitemap — one content bucket of the 8-bucket model, served as a plain
 * `<urlset>`. `$file` is e.g. `jobs-details.xml` (chunk 0) or `jobs-details-2.xml`
 * (chunk 1). Unknown bucket / non-xml → 404. CDN-cached for an hour.
 */
import { createFileRoute, notFound } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';

export const Route = createFileRoute('/sitemap/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = parseBucketFilename(params.file);
        if (!parsed) throw notFound();

        const origin = new URL(getRequest().url).origin;
        const urls = await buildBucketUrls(getBoard(), origin, parsed.bucket);
        const chunks = chunk(urls, SITEMAP_CHUNK_SIZE);

        // Chunk 0 always serves (an empty bucket → a valid empty urlset, since
        // the index may list a bucket that turns out empty); a higher chunk that
        // does not exist → 404.
        const slice =
          chunks[parsed.chunkIndex] ?? (parsed.chunkIndex === 0 ? [] : null);
        if (slice === null) throw notFound();

        if (chunks.length > 1 && parsed.chunkIndex === 0) {
          console.warn(
            `[sitemap] bucket "${parsed.bucket}" spans ${chunks.length} chunks ` +
              `(>${SITEMAP_CHUNK_SIZE} URLs); the index links only chunk 0. ` +
              `Full chunk-indexing needs a shared build cache (hosted parity gap).`,
          );
        }

        return new Response(renderUrlset(slice), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
