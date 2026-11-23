/**
 * `/.well-known/oauth-authorization-server`: the OAuth authorization server
 * metadata (RFC 8414) for sign-in from assistants, from the Board API.
 * Answered only with sign-in on (a `pk_…` board key); see ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/.well-known/oauth-authorization-server')(
  {
    server: {
      handlers: {
        GET: ({ request }) => mcpHandler(request),
        HEAD: ({ request }) => mcpHandler(request),
        OPTIONS: ({ request }) => mcpHandler(request),
      },
    },
  },
);
