/**
 * The board MCP server's consent step, on this site's own consent page
 * (`/authorize`, the `assistantConsent` page). The Board API checks the assistant's OAuth request and
 * the signed-in visitor and says which step comes next; this site only
 * renders that step and passes the visitor's Allow or Cancel back
 * (`board.mcpConsent.get` and `submit`).
 *
 * Both calls name this site in `MCP_SITE_HEADER`: the request URL's origin,
 * the same one the MCP handler sends (src/routes/-mcp-handler.ts), which is
 * the sign-in's issuer. A self-hosted site needs it; on a Builder site the
 * API takes the site's origin from the gateway's signed identity first and
 * reads the header only from a publishable-key (`external-sdk`) caller.
 */
import { isBoardApiError } from '@cavuno/board';
import { MCP_SITE_HEADER } from '@cavuno/board/mcp';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { mcpAuthorizeQuery } from '../lib/mcp-authorize-query';
import { gatedRead } from './board-access';

import { boardErrorMessage } from '@/lib/board-error-message';
import type {
  McpConsentDecision,
  McpConsentStep as BoardMcpConsentStep,
} from '@cavuno/board';

type BoardStep<Next extends BoardMcpConsentStep['next']> = Extract<
  BoardMcpConsentStep,
  { next: Next }
>;

/**
 * The API also sends the step in English; the page words it in the board's
 * language from the facts instead.
 */
type EnglishWording = 'heading' | 'trust' | 'scopes' | 'redirectNotice';

/** Too many tries, said on the page: this site's own error code. */
type RateLimitedStep = {
  next: 'error';
  code: 'rate_limited';
  message: string;
};

/**
 * The step as facts, which the page words in the board's language. Only an
 * error's `message` is read, for a code this site doesn't know yet.
 */
export type McpConsentStep =
  | Omit<BoardStep<'consent'>, EnglishWording>
  | Exclude<BoardMcpConsentStep, { next: 'consent' }>
  | RateLimitedStep;

/** Why the person can't connect; `rate_limited` is this site's own. */
export type McpConsentErrorCode = Extract<
  McpConsentStep,
  { next: 'error' }
>['code'];

export type McpConsentAccountScope = NonNullable<
  BoardStep<'error'>['accountScopes']
>[number];

export type McpConsentSubject = NonNullable<
  BoardStep<'consent'>['access']['employer']
>['reads'][number];

/** Allow or Cancel's answer: the assistant's callback, or an error. */
export type { McpConsentDecision };

export type McpConsentResult =
  | { ok: true; data: McpConsentDecision }
  | { ok: false; code: string | null; message: string };

function noStore() {
  // The step carries the visitor's email and a token bound to them.
  setResponseHeader('cache-control', 'private, no-store');
}

/** The visitor's bearer and grant, and this site's origin. */
function consentHeaders(headers: Record<string, string>) {
  return {
    ...headers,
    [MCP_SITE_HEADER]: new URL(getRequest().url).origin,
  };
}

export const getMcpConsentStep = createServerFn({ method: 'GET' })
  .validator((input: { search: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (headers): Promise<McpConsentStep> => {
      noStore();
      const query = mcpAuthorizeQuery(data.search);
      try {
        return await getBoard().mcpConsent.get(query, {
          headers: consentHeaders(headers),
        });
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
      approvedScopes?: string[];
    }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (headers): Promise<McpConsentResult> => {
      noStore();
      try {
        const decision = await getBoard().mcpConsent.submit(data, {
          headers: consentHeaders(headers),
        });
        return { ok: true, data: decision };
      } catch (error) {
        if (isBoardApiError(error)) {
          return { ok: false, code: error.code, message: error.message };
        }
        throw error;
      }
    }),
  );
