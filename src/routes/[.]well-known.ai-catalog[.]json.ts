/**
 * `/.well-known/ai-catalog.json`: the AI Catalog listing the board's MCP
 * Server Card, so an assistant can find the server from the board's domain
 * alone. From the Board API; see ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/.well-known/ai-catalog.json')({
  server: {
    handlers: {
      GET: ({ request }) => mcpHandler(request),
      HEAD: ({ request }) => mcpHandler(request),
    },
  },
});
