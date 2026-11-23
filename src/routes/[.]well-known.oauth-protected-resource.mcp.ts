/**
 * `/.well-known/oauth-protected-resource/mcp`: the protected-resource
 * metadata for `/mcp` (RFC 9728), from the Board API.
 * Answered only with sign-in on (a `pk_…` board key); see ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute(
  '/.well-known/oauth-protected-resource/mcp',
)({
  server: {
    handlers: {
      GET: ({ request }) => mcpHandler(request),
      HEAD: ({ request }) => mcpHandler(request),
      OPTIONS: ({ request }) => mcpHandler(request),
    },
  },
});
