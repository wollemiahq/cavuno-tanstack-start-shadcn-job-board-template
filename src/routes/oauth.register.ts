/**
 * `/oauth/register`: an assistant registers itself as an OAuth client
 * (RFC 7591), forwarded to the Board API.
 * Answered only with sign-in on (a `pk_…` board key); the SDK handler owns
 * the method policy (405s included). See ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/oauth/register')({
  server: {
    handlers: {
      ANY: ({ request }) => mcpHandler(request),
    },
  },
});
