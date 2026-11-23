/**
 * `/oauth/revoke`: an assistant revokes its token (RFC 7009), forwarded to
 * the Board API.
 * Answered only with sign-in on (a `pk_…` board key); see ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/oauth/revoke')({
  server: {
    handlers: {
      POST: ({ request }) => mcpHandler(request),
      OPTIONS: ({ request }) => mcpHandler(request),
    },
  },
});
