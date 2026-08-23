/**
 * POST-only real-Apply handoff for the current TanStack starter.
 *
 * It intentionally has no GET handler and never accepts a destination or
 * country from the browser. The browser only receives a 303 after Cavuno has
 * created an opaque intent; the next request therefore reaches the user-edge
 * gateway directly instead of using this server's IP address.
 */
import { createFileRoute } from '@tanstack/react-router';

import { applyCopy } from '@/copy-groups/apply';
import { authHeaders, getBoard, getSessionRefresherFor } from '@/lib/board';
import {
  clearSessionForSource,
  getDataSource,
  parseGrantForSource,
  parseSessionForSource,
  serializeSessionForSource,
} from '@/lib/data-source.server';
import { decideSession } from '@/lib/session-middleware';
import {
  applyJobSlug,
  applySessionKey,
  createApplyIntent,
  gatewayRedirect,
  isSameOriginApplyRequest,
  ordinaryFallbackRedirect,
  withApplyCookies,
} from '@/server/apply-intent';

function applyErrorResponse(status: 400 | 503): Response {
  return new Response(applyCopy().applicationSubmitError, {
    status,
    headers: {
      'cache-control': 'no-store',
      'referrer-policy': 'strict-origin',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export const Route = createFileRoute('/apply')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginApplyRequest(request)) {
          return applyErrorResponse(400);
        }
        const jobSlug = await applyJobSlug(request);
        if (!jobSlug) {
          return applyErrorResponse(400);
        }

        const cookieHeader = request.headers.get('cookie');
        const dataSource = getDataSource();
        // Match the normal server-function session lifecycle: a refreshed
        // bearer is forwarded and persisted, a failed refresh becomes signed
        // out, and an unexpired session is used as-is.
        const resolution = await decideSession(
          parseSessionForSource(cookieHeader, dataSource),
          Date.now(),
          getSessionRefresherFor(dataSource),
        );
        const applySession = applySessionKey(cookieHeader);
        const grant = parseGrantForSource(cookieHeader, dataSource);
        const headers = {
          ...(resolution.session
            ? authHeaders(resolution.session.accessToken)
            : {}),
          ...(grant ? { 'x-board-access': grant } : {}),
        };
        const cookies = [
          resolution.setCookie === 'rotate' && resolution.session
            ? serializeSessionForSource(resolution.session, dataSource)
            : resolution.setCookie === 'clear'
              ? clearSessionForSource(dataSource)
              : null,
          applySession.setCookie,
        ];
        const board = getBoard();
        try {
          const intent = await createApplyIntent(
            board.client,
            jobSlug,
            applySession.sessionKey,
            headers,
          );
          return withApplyCookies(gatewayRedirect(intent, null), cookies);
        } catch {
          // `all_jobs` ordinary external applies are intentionally fail-open
          // on intent infrastructure failure. Re-read the trusted job; never
          // use a browser URL and never release a Sponsored destination.
          let job: {
            isSponsored?: boolean | null;
            applicationUrl: string | null;
            applyAction?: string | null;
          };
          try {
            job = (await board.jobs.retrieve(jobSlug, undefined, {
              headers,
            })) as typeof job;
          } catch {
            return withApplyCookies(applyErrorResponse(503), cookies);
          }
          const fallback = ordinaryFallbackRedirect({
            isSponsored: job.isSponsored,
            applicationUrl: job.applicationUrl,
            applyAction: job.applyAction,
          });
          if (fallback) return withApplyCookies(fallback, cookies);
          return withApplyCookies(applyErrorResponse(503), cookies);
        }
      },
    },
  },
});
