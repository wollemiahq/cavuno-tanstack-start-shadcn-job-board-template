import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { readMcpServerFlag } from '../board/board-feature-flags';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { readPublicOrigin } from '../lib/public-origin';
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
      const description = m.mcpDocs_description({ boardName });
      const url = selfUrl(origin, '/mcp/docs');

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
        salaryTools: boardContext.jobForm.salary.visible,
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
