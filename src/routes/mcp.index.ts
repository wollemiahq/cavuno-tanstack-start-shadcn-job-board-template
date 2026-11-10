/**
 * `/mcp`: the board's MCP server (stateless Streamable HTTP over POST).
 * Every method goes to the SDK handler, which sends a browser to
 * `/mcp/docs` and answers other methods 405 itself. See ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/mcp/')({
  server: {
    handlers: {
      ANY: ({ request }) => mcpHandler(request),
    },
  },
});
