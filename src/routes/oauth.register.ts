/**
 * `/oauth/register`: an assistant registers itself as an OAuth client
 * (RFC 7591), forwarded to the Board API.
 * Answered only with sign-in on (a `pk_…` board key); see ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/oauth/register')({
  server: {
    handlers: {
      POST: ({ request }) => mcpHandler(request),
      OPTIONS: ({ request }) => mcpHandler(request),
    },
  },
});
