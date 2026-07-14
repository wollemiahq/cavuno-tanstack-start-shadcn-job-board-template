import {
  bucketFilename,
  listedBuckets,
  renderSitemapIndex,
} from '@cavuno/board/sitemap';
/**
 * Sitemap index — points at one sub-sitemap per content bucket (the hosted
 * board's 8-bucket model). Each bucket is served by `sitemap.$file.ts`. The
 * index itself is cheap: it lists buckets from board features, no enumeration.
 * CDN-cached for an hour.
 */
import { createFileRoute } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const origin = new URL(getRequest().url).origin;
        const buckets = await listedBuckets(getBoard());
        const locs = buckets.map(
          (bucket) => `${origin}/sitemap/${bucketFilename(bucket)}`,
        );

        return new Response(renderSitemapIndex(locs), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
