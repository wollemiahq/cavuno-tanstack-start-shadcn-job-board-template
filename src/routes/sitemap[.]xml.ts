/**
 * Sitemap index — points at one sub-sitemap per content bucket (the hosted
 * board's 8-bucket model). Each bucket is served by `sitemap.$file.ts`. The
 * index enumerates each bucket once so catalogs larger than the hosted chunk
 * size publish every numbered file. Each XML response is cached for five
 * minutes over the longer-lived shared context.
 */
import { createFileRoute } from '@tanstack/react-router';

import { createSitemapIndexHandler } from './-sitemap-handler';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: createSitemapIndexHandler(),
    },
  },
});
