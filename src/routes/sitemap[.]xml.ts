import { renderSitemapIndex } from '@cavuno/board/sitemap';
/**
 * Sitemap index — points at one sub-sitemap per content bucket (the hosted
 * board's 8-bucket model). Each bucket is served by `sitemap.$file.ts`. The
 * index enumerates each bucket once so catalogs larger than the hosted chunk
 * size publish every numbered file. Each XML response is cached for five
 * minutes over the longer-lived shared context.
 */
import { createFileRoute } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';

import { getPrimaryBoard } from '../lib/board';
import {
  loadSitemapContext,
  SITEMAP_RESPONSE_CACHE_CONTROL,
  sitemapIndexLocations,
} from '../lib/sitemap-context';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const origin = new URL(getRequest().url).origin;
        // Public discovery is deployment truth, never the preview data-source
        // cookie a signed-in operator may carry.
        const board = getPrimaryBoard();
        const context = await loadSitemapContext(board, origin);
        const locs = sitemapIndexLocations(origin, context);

        return new Response(renderSitemapIndex(locs), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': SITEMAP_RESPONSE_CACHE_CONTROL,
          },
        });
      },
    },
  },
});
