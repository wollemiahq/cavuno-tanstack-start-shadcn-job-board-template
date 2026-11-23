import { createMcpHandler } from '@cavuno/board/mcp';

import { getServerEnv } from '../lib/env';
import { localizePath } from '../lib/localized-path';
import { MCP_CONSENT_PATH } from '../lib/mcp-authorize-query';

/**
 * The board's public MCP server on its own host: `/mcp`, `/mcp/server-card`
 * and `/.well-known/ai-catalog.json` forward to the Board API through the
 * SDK's `createMcpHandler`. The setup page `/mcp/docs` stays this starter's
 * own route (src/routes/mcp.docs.tsx).
 *
 * Sign-in from assistants: with the board's publishable key (`pk_…`), the
 * handler also answers the OAuth discovery documents and `/oauth/*`, and
 * sends `/oauth/authorize` to this site's consent page (`/authorize`, in the
 * board's URL words). The Board API signs people in only on the key's
 * registered origin or one of the board's development origins, named by the
 * request URL's origin (the SDK's default `siteOrigin`); the consent page's
 * server calls name the same one (src/server/mcp-consent.ts). A board
 * configured by slug keeps the anonymous server, and those paths answer 404:
 * the SDK refuses sign-in without the key.
 *
 * On a board deployed through Cavuno's Builder, these paths are answered
 * before a request reaches this app, so the routes only take effect when the
 * board is deployed on its own; on Builder they are never reached.
 *
 * One handler per board key, API origin and consent path, created on the
 * first request (configuration is read per request, never at module scope).
 * The handler holds no request state.
 */
let current:
  | {
      apiUrl: string;
      board: string;
      consentPath: string | undefined;
      handle: (r: Request) => Promise<Response>;
    }
  | undefined;

export function mcpHandler(request: Request): Promise<Response> {
  const { apiUrl, board } = getServerEnv();
  const consentPath = board.startsWith('pk_')
    ? localizePath(MCP_CONSENT_PATH)
    : undefined;
  if (
    current?.apiUrl !== apiUrl ||
    current.board !== board ||
    current.consentPath !== consentPath
  ) {
    current = {
      apiUrl,
      board,
      consentPath,
      handle: createMcpHandler({ board, baseUrl: apiUrl, consentPath }),
    };
  }
  return current.handle(request);
}
