/**
 * `/.well-known/ard.json`: the Agentic Resource Discovery (ARD) manifest
 * listing the board's MCP Server Card, so an assistant or registry can find
 * the server from the board's domain alone. The same manifest as
 * `/.well-known/ai-catalog.json`, the path ARD replaced. From the Board API;
 * see ./-mcp-handler.ts.
 */
import { createFileRoute } from '@tanstack/react-router';

import { mcpHandler } from './-mcp-handler';

export const Route = createFileRoute('/.well-known/ard.json')({
  server: {
    handlers: {
      GET: ({ request }) => mcpHandler(request),
      HEAD: ({ request }) => mcpHandler(request),
    },
  },
});
