/**
 * Sub-sitemap — one content bucket of the 8-bucket model, served as a plain
 * `<urlset>`. `$file` is e.g. `jobs-details.xml` (chunk 0) or `jobs-details-2.xml`
 * (chunk 1). Unknown bucket / non-xml → 404. Each XML response is cached for
 * five minutes over the longer-lived shared context.
 */
import { createFileRoute } from '@tanstack/react-router';

import { createSitemapFileHandler } from './-sitemap-handler';

export const Route = createFileRoute('/sitemap/$file')({
  server: {
    handlers: {
      GET: createSitemapFileHandler(),
    },
  },
});
