/**
 * Internal route that answers Markdown twins (`/x.md`). The server entry
 * rewrites a twin request to `/markdown-twin/x.md` and refuses outside
 * requests for this prefix; see src/lib/markdown-twin/routes.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { serveMarkdownTwin } from '../server/markdown-twin';

export const Route = createFileRoute('/markdown-twin/$')({
  server: {
    handlers: {
      GET: ({ request }) => serveMarkdownTwin(request),
    },
  },
});
