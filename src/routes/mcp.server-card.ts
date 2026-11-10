/**
 * `/mcp/server-card`: the MCP Server Card (the server's name, version and
 * URL), from the Board API. See ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/mcp/server-card')({
  server: {
    handlers: {
      GET: ({ request }) => mcpHandler(request),
      HEAD: ({ request }) => mcpHandler(request),
    },
  },
});
