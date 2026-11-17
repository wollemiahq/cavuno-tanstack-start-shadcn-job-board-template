/**
 * The board MCP server's consent step (`/oauth/authorize`), rendered in this
 * site's own layout. The Board API checks the assistant's OAuth request and
 * the signed-in visitor and says which step comes next; this site only
 * renders that step and passes the visitor's Allow or Cancel back.
 *
 * The SDK has no methods for these two calls yet, so they go through
 * `client.fetch` with types written here from the published schema
 * (`getBoardMcpConsent`, `submitBoardMcpConsent`).
 */
import { isBoardApiError } from '@cavuno/board';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { mcpAuthorizeQuery } from '../lib/mcp-authorize-query';
import { gatedRead } from './board-access';

/** Text with emphasised parts, as the API words the redirect notice. */
export type McpConsentInline = string | { strong: string };

export type McpConsentStep =
  | {
      next: 'consent';
      /** Carried back unchanged with the decision. */
      request: string;
      consentToken: string;
      clientName: string;
      knownAssistant: string | null;
      heading: string;
      trust: { label: string; description: string };
      scopes: string[];
      redirectNotice: McpConsentInline[] | null;
      email: string;
    }
  | { next: 'sign_in' | 'verify_email'; returnTo: string }
  | { next: 'redirect'; location: string }
  | { next: 'error'; message: string };

export type McpConsentDecision = Extract<
  McpConsentStep,
  { next: 'redirect' | 'error' }
>;

export type McpConsentResult =
  | { ok: true; data: McpConsentDecision }
  | { ok: false; code: string | null; message: string };

function noStore() {
  // The step carries the visitor's email and a token bound to them.
  setResponseHeader('cache-control', 'private, no-store');
}

export const getMcpConsentStep = createServerFn({ method: 'GET' })
  .validator((input: { search: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (headers) => {
      noStore();
      const query = mcpAuthorizeQuery(data.search);
      try {
        return await getBoard().client.fetch<McpConsentStep>(
          `/mcp/consent${query}`,
          { headers },
        );
      } catch (error) {
        // The board has no MCP sign-in for this site: no such page.
        if (isBoardApiError(error) && error.status === 404) throw notFound();
        throw error;
      }
    }),
  );

export const decideMcpConsent = createServerFn({ method: 'POST' })
  // The Board API validates the body; this only carries it.
  .validator(
    (input: {
      request: string;
      consentToken: string;
      decision: 'allow' | 'deny';
    }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (headers): Promise<McpConsentResult> => {
      noStore();
      try {
        const decision = await getBoard().client.fetch<McpConsentDecision>(
          '/mcp/consent',
          { method: 'POST', body: data, headers },
        );
        return { ok: true, data: decision };
      } catch (error) {
        if (isBoardApiError(error)) {
          return { ok: false, code: error.code, message: error.message };
        }
        throw error;
      }
    }),
  );
