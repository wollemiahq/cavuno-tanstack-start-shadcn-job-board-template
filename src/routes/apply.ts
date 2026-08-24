/**
 * POST-only real-Apply handoff for the current TanStack starter.
 *
 * It intentionally has no GET handler and never accepts a destination or
 * country from the browser. Enhanced clients receive the opaque gateway URL;
 * plain forms receive a 303. Either way, the candidate's browser reaches the
 * user-edge gateway directly so Cavuno never evaluates this server's IP.
 */
import { createFileRoute } from '@tanstack/react-router';

import { applyCopy } from '@/copy-groups/apply';
import {
  authHeaders,
  getBoard,
  getSessionRefresherFor,
  withApplyGatewayCapability,
} from '@/lib/board';
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
  applyJsonGateway,
  applyJsonRedirect,
  applySessionKey,
  createApplyIntent,
  gatewayLocation,
  gatewayRedirect,
  isSameOriginApplyRequest,
  ordinaryFallbackRedirect,
  wantsApplyJson,
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
        const wantsJson = wantsApplyJson(request);
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
        const headers: Record<string, string> = resolution.session
          ? authHeaders(resolution.session.accessToken)
          : {};
        if (grant) headers['x-board-access'] = grant;
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
            board,
            jobSlug,
            applySession.sessionKey,
            headers,
          );
          if (wantsJson) {
            return withApplyCookies(
              applyJsonGateway(gatewayLocation(intent)),
              cookies,
            );
          }
          return withApplyCookies(gatewayRedirect(intent, null), cookies);
        } catch {
          // `all_jobs` ordinary external applies are intentionally fail-open
          // on intent infrastructure failure. Re-read the trusted job; never
          // use a browser URL and never release a Sponsored destination.
          let job;
          try {
            job = await board.jobs.retrieve(jobSlug, undefined, {
              headers: withApplyGatewayCapability(headers),
            });
          } catch {
            return withApplyCookies(applyErrorResponse(503), cookies);
          }
          const fallback = ordinaryFallbackRedirect({
            isSponsored: job.isSponsored,
            applicationUrl: job.applicationUrl,
            applyAction: job.applyAction,
          });
          if (fallback) {
            if (wantsJson) {
              const location = fallback.headers.get('location');
              if (location) {
                return withApplyCookies(applyJsonRedirect(location), cookies);
              }
            }
            return withApplyCookies(fallback, cookies);
          }
          return withApplyCookies(applyErrorResponse(503), cookies);
        }
      },
    },
  },
});
