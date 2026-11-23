/**
 * `/oauth/authorize`: where an assistant starts sign-in. The handler sends
 * the browser to this site's consent page with the query unchanged; the
 * server entry then keeps that query for the page
 * (src/lib/mcp-authorize-query.ts).
 * Answered only with sign-in on (a `pk_…` board key); the SDK handler owns
 * the method policy (405s included). See ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/oauth/authorize')({
  server: {
    handlers: {
      ANY: ({ request }) => mcpHandler(request),
    },
  },
});
