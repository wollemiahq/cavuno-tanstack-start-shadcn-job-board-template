/**
 * The board MCP server's consent step, on this site's own consent page
 * (`/authorize`, the `assistantConsent` page). The Board API checks the assistant's OAuth request and
 * the signed-in visitor and says which step comes next; this site only
 * renders that step and passes the visitor's Allow or Cancel back.
 *
 * Until the SDK this site pins has `board.mcpConsent`, the two calls go
 * through `client.fetch` with types written here from the published schema
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

import { boardErrorMessage } from '@/lib/board-error-message';

/** Why the person can't connect; `rate_limited` is this site's own. */
export type McpConsentErrorCode =
  | 'invalid_link'
  | 'unknown_client'
  | 'client_rejected'
  | 'redirect_mismatch'
  | 'not_signed_in'
  | 'no_account'
  | 'expired'
  | 'unavailable'
  | 'rate_limited';

export type McpConsentAccountScope = 'candidate' | 'employer';

export type McpConsentSubject = 'profiles' | 'jobs' | 'applicants';

/**
 * The step as facts, which the page words in the board's language. The API
 * also sends the step in English (`heading`, `trust`, `scopes`, …); only an
 * error's `message` is read, for a code this site doesn't know yet.
 */
export type McpConsentStep =
  | {
      next: 'consent';
      /** Carried back unchanged with the decision. */
      request: string;
      consentToken: string;
      clientName: string;
      knownAssistant: string | null;
      email: string;
      trustLevel: 'domain_verified' | 'verified' | 'unverified';
      publisherHost: string | null;
      redirectHost: string;
      access: {
        candidate: 'account' | 'searches' | null;
        employer: {
          reads: McpConsentSubject[];
          changes: McpConsentSubject[];
        } | null;
      };
    }
  | { next: 'sign_in' | 'verify_email'; returnTo: string }
  | { next: 'redirect'; location: string }
  | {
      next: 'error';
      code: McpConsentErrorCode;
      message: string;
      accountScopes?: McpConsentAccountScope[];
    };

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
    gatedRead(context, async (headers): Promise<McpConsentStep> => {
      noStore();
      const query = mcpAuthorizeQuery(data.search);
      try {
        return await getBoard().client.fetch<McpConsentStep>(
          `/mcp/consent${query}`,
          { headers },
        );
      } catch (error) {
        if (!isBoardApiError(error)) throw error;
        // The board has no MCP sign-in for this site: no such page.
        if (error.status === 404) throw notFound();
        // Too many tries: a message in the page, not the site's error page,
        // mid-way through connecting an assistant.
        if (error.status === 429) {
          return {
            next: 'error',
            code: 'rate_limited',
            message: boardErrorMessage(error),
          };
        }
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
