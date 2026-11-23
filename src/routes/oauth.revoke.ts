/**
 * `/oauth/revoke`: an assistant revokes its token (RFC 7009), forwarded to
 * the Board API.
 * Answered only with sign-in on (a `pk_…` board key); the SDK handler owns
 * the method policy (405s included). See ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/oauth/revoke')({
  server: {
    handlers: {
      ANY: ({ request }) => mcpHandler(request),
    },
  },
});
