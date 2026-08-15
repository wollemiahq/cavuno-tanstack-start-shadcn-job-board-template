/**
 * robots.txt — hosted-parity handler at /robots.txt. `User-Agent: *` +
 * `Allow: /`, listing-pagination `Disallow`s (same as hosted), and a
 * `Sitemap:` on the board's canonical base (board.seo().canonicalBase), not the
 * request origin.
 */
import { createFileRoute } from '@tanstack/react-router';

import { getBoard } from '../lib/board';
import { robotsResponse } from '../lib/seo-handlers';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => robotsResponse(await getBoard().seo()),
    },
  },
});
