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
import { createFileRoute } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import {
  LOCALIZED_BUCKETS,
  renderUrlsetWithAlternates,
} from '../lib/sitemap-alternates';

// `throw notFound()` inside a server handler serializes as a 200 JSON
// body — crawlers need a REAL 404 status for unknown sitemap files.
const notFoundResponse = () => new Response('Not found', { status: 404 });

export const Route = createFileRoute('/sitemap/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = parseBucketFilename(params.file);
        if (!parsed) return notFoundResponse();

        const origin = new URL(getRequest().url).origin;
        const urls = await buildBucketUrls(getBoard(), origin, parsed.bucket);
        const chunks = chunk(urls, SITEMAP_CHUNK_SIZE);

        // Chunk 0 always serves (an empty bucket → a valid empty urlset, since
        // the index may list a bucket that turns out empty); a higher chunk that
        // does not exist → 404.
        const slice =
          chunks[parsed.chunkIndex] ?? (parsed.chunkIndex === 0 ? [] : null);
        if (slice === null) return notFoundResponse();

        if (chunks.length > 1 && parsed.chunkIndex === 0) {
          console.warn(
            `[sitemap] bucket "${parsed.bucket}" spans ${chunks.length} chunks ` +
              `(>${SITEMAP_CHUNK_SIZE} URLs); the index links only chunk 0. ` +
              `Full chunk-indexing needs a shared build cache (hosted parity gap).`,
          );
        }

        // Self-canonical buckets carry xhtml:link locale alternates so
        // crawlers can DISCOVER /de/ and /fr/, not just infer them from
        // page-level hreflang. External-canonical buckets stay plain.
        const xml = LOCALIZED_BUCKETS.includes(parsed.bucket)
          ? renderUrlsetWithAlternates(slice, origin)
          : renderUrlset(slice);
        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
