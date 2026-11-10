import { createMcpHandler } from '@cavuno/board/mcp';

import { getServerEnv } from '../lib/env';

/**
 * The board's public MCP server on its own host: `/mcp`, `/mcp/server-card`
 * and `/.well-known/ai-catalog.json` forward to the Board API through the
 * SDK's `createMcpHandler`. The setup page `/mcp/docs` stays this starter's
 * own route (src/routes/mcp.docs.tsx).
 *
 * On a board deployed through Cavuno's Builder, these paths are answered
 * before a request reaches this app, so the routes only take effect when the
 * board is deployed on its own; on Builder they are never reached.
 *
 * One handler per board key and API origin, created on the first request
 * (configuration is read per request, never at module scope). The handler
 * holds no request state.
 */
let current:
  | { apiUrl: string; board: string; handle: (r: Request) => Promise<Response> }
  | undefined;

export function mcpHandler(request: Request): Promise<Response> {
  const { apiUrl, board } = getServerEnv();
  if (current?.apiUrl !== apiUrl || current.board !== board) {
    current = {
      apiUrl,
      board,
      handle: createMcpHandler({ board, baseUrl: apiUrl }),
    };
  }
  return current.handle(request);
}
