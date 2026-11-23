/**
 * `/.well-known/oauth-protected-resource`: the OAuth protected-resource
 * metadata (RFC 9728) for sign-in from assistants, from the Board API.
 * Answered only with sign-in on (a `pk_…` board key); the SDK handler owns
 * the method policy (405s included). See ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/.well-known/oauth-protected-resource/')({
  server: {
    handlers: {
      ANY: ({ request }) => mcpHandler(request),
    },
  },
});
