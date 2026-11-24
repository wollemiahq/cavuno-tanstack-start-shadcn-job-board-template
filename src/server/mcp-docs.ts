import { MCP_SITE_HEADER } from '@cavuno/board/mcp';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { readMcpServerFlag } from '../board/board-feature-flags';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { getServerEnv } from '../lib/env';
import { readPublicOrigin } from '../lib/public-origin';
import { createSettledCache } from '../lib/settled-cache';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { footerCopy } from '@/copy-groups/footer';
import { selfUrl } from '@/lib/self-url';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

/** A config-file key for the board's server: its name, lower-cased and hyphenated. */
export function mcpServerKey(boardName: string): string {
  return (
    boardName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'job-board'
  );
}

/** One tool the board's MCP server serves, as its `tools/list` describes it. */
export interface McpDocsTool {
  name: string;
  description: string;
  /** Whether it uses the person's own account, so they sign in first. */
  signIn: boolean;
}

const MCP_TOOLS_TTL_MS = 10 * 60_000;
const mcpTools = createSettledCache<string, McpDocsTool[]>({
  ttlMs: MCP_TOOLS_TTL_MS,
  maxEntries: 4,
});

/**
 * The `tools/list` result out of a Streamable HTTP reply, which the server
 * sends either as JSON or as one server-sent `message` event.
 */
export function parseMcpToolsList(body: string): McpDocsTool[] {
  const json = body.trimStart().startsWith('{')
    ? body
    : body
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trim())
        .join('');
  // SAFETY: the Board API's MCP server answers tools/list with the MCP
  // spec's result shape: every tool has a string `name`, an optional string
  // `description` and optional `_meta`, where the Board API puts the
  // tool's `securitySchemes` (`noauth`, or `oauth2` for a signed-in tool).
  const reply = JSON.parse(json) as {
    result?: {
      tools?: Array<{
        name: string;
        description?: string;
        _meta?: { securitySchemes?: Array<{ type?: string }> };
      }>;
    };
  };
  const tools = reply.result?.tools;
  if (!tools) throw new Error('MCP tools/list reply has no tools');
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? '',
    signIn:
      tool._meta?.securitySchemes?.some((scheme) => scheme.type === 'oauth2') ??
      false,
  }));
}

/**
 * The tools the board's own MCP server lists on this site, so the page names
 * exactly what an assistant gets (the salary tools only when the board shows
 * salaries, the signed-in tools only where people can sign in). The call
 * names this site in `MCP_SITE_HEADER`, as the `/mcp` forward and the
 * consent page do: a self-hosted site needs it for the signed-in tools, and
 * a Builder site gets them from the gateway's signed identity. A failed read
 * serves the last good list; with none, it throws.
 */
async function readMcpTools(): Promise<McpDocsTool[]> {
  const { apiUrl, board } = getServerEnv();
  const site = new URL(getRequest().url).origin;
  const key = `${board} ${site}`;
  const cached = mcpTools.get(key);
  if (cached) return cached;
  const readAt = Date.now();
  try {
    const response = await fetch(
      `${apiUrl.replace(/\/+$/, '')}/v1/boards/${encodeURIComponent(board)}/mcp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          [MCP_SITE_HEADER]: site,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      },
    );
    if (!response.ok) {
      throw new Error(`MCP tools/list answered ${response.status}`);
    }
    const tools = parseMcpToolsList(await response.text());
    mcpTools.set(key, tools, readAt);
    return tools;
  } catch (error) {
    const stale = mcpTools.getStale(key);
    if (stale) return stale;
    throw error;
  }
}

/**
 * `/mcp/docs`: how to add the board's MCP server to an AI assistant. The
 * server itself answers at `/mcp` on the board's canonical origin; this page
 * exists only while the board serves it (`features.mcp`).
 */
export const getMcpDocsView = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async () => {
      const boardContext = await readBoardContext();
      if (!readMcpServerFlag(boardContext.features)) throw notFound();

      const origin = await readPublicOrigin();
      const boardName = boardContext.name;
      const mcpUrl = `${origin}/mcp`;
      const key = mcpServerKey(boardName);
      const title = m.mcpDocs_title({ boardName });
      const url = selfUrl(origin, '/mcp/docs');
      const tools = await readMcpTools();
      const signIn = tools.some((tool) => tool.signIn);
      const description = signIn
        ? m.mcpDocs_descriptionSignIn({ boardName })
        : m.mcpDocs_description({ boardName });

      return {
        boardName,
        mcpUrl,
        claudeCodeCommand: `claude mcp add --transport http ${key} ${mcpUrl}`,
        cursorConfig: JSON.stringify(
          { mcpServers: { [key]: { url: mcpUrl } } },
          null,
          2,
        ),
        vscodeConfig: JSON.stringify(
          { servers: { [key]: { type: 'http', url: mcpUrl } } },
          null,
          2,
        ),
        tools,
        signIn,
        posting: tools.some((tool) => tool.name === 'post_job_public'),
        head: {
          meta: [{ title }, { name: 'description', content: description }],
          links: [{ rel: 'canonical', href: url }],
        },
        // SAFETY: the SDK builder returns a plain JSON-LD object; the
        // round trip erases readonly helper types for the server-fn
        // serializer, as in src/server/legal-pages.ts.
        jsonLd: JSON.parse(
          JSON.stringify([
            createBreadcrumbJsonLd([
              { label: breadcrumbsCopy().home, href: selfUrl(origin, '/') },
              { label: footerCopy().mcpLabel },
            ]),
          ]),
        ) as JsonObject[],
      };
    }),
  );
