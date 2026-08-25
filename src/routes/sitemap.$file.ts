import {
  parseBucketFilename,
  renderUrlset,
} from '@cavuno/board/sitemap';
/**
 * Sub-sitemap — one content bucket of the 8-bucket model, served as a plain
 * `<urlset>`. `$file` is e.g. `jobs-details.xml` (chunk 0) or `jobs-details-2.xml`
 * (chunk 1). Unknown bucket / non-xml → 404. Each XML response is cached for
 * five minutes over the longer-lived shared context.
 */
import { createFileRoute } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';

import { getPrimaryBoard } from '../lib/board';
import {
  findSitemapChunk,
  loadSitemapContext,
  SITEMAP_RESPONSE_CACHE_CONTROL,
} from '../lib/sitemap-context';
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
        const context = await loadSitemapContext(getPrimaryBoard(), origin);
        const slice = findSitemapChunk(
          context,
          parsed.bucket,
          parsed.chunkIndex,
        );
        if (!slice) return notFoundResponse();

        // Self-canonical buckets carry xhtml:link locale alternates so
        // crawlers can DISCOVER /de/ and /fr/, not just infer them from
        // page-level hreflang. External-canonical buckets stay plain.
        const xml = LOCALIZED_BUCKETS.includes(parsed.bucket)
          ? renderUrlsetWithAlternates(slice, origin)
          : renderUrlset(slice);
        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': SITEMAP_RESPONSE_CACHE_CONTROL,
          },
        });
      },
    },
  },
});
