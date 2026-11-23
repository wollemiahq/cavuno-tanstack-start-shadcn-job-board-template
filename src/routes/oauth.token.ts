/**
 * `/oauth/token`: an assistant exchanges its code or refresh token,
 * forwarded to the Board API.
 * Answered only with sign-in on (a `pk_…` board key); see ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/oauth/token')({
  server: {
    handlers: {
      POST: ({ request }) => mcpHandler(request),
      OPTIONS: ({ request }) => mcpHandler(request),
    },
  },
});
