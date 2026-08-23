import {
  isNotFound,
  type ApplicationsListQuery,
  type ApplyBody,
  type UpdateApplicationFactsBody,
} from '@cavuno/board';
/**
 * Authenticated server functions for candidate applications.
 * Native apply lives on `board.jobs.*` (apply / uploadApplicationResume /
 * myApplication); the candidate's own list + detail + withdraw live on
 * `board.me.applications.*`. Same session-bearer + board-access pattern as the
 * `/account` dashboard.
 */
import { createServerFn } from '@tanstack/react-start';
import {
  getRequestHeader,
  setCookie,
  setResponseHeader,
} from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import {
  requireSessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';
import { gatedRead } from './board-access';
import {
  ensureApplySession,
  prepareNativeApply,
  submitNativeApply,
} from './native-apply';

/** Bearer + board-access grant for one gated `/me/*` or authed apply call. */
function authedHeaders(
  context: SessionContext & BoardAccessContext,
): Record<string, string> {
  return { ...context.authHeaders, ...context.boardAccessHeaders };
}

async function requireVerifiedBoardUser(headers: Record<string, string>) {
  const me = await getBoard().me.retrieve(undefined, { headers });
  if (!me.emailVerified) {
    throw new Error('EMAIL_UNVERIFIED');
  }
  return me;
}

/** The candidate's applications across the board (newest first). */
export const getApplications = createServerFn({ method: 'GET' })
  .validator((input?: ApplicationsListQuery) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.applications.list(data, { headers });
    }),
  );

/** One application in detail (by application id). */
export const getApplication = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.applications.retrieve(data.id, { headers });
    }),
  );

/** Edit the candidate-supplied facts (cover note / name) on an application. */
export const updateApplicationFacts = createServerFn({ method: 'POST' })
  .validator((input: { id: string; body: UpdateApplicationFactsBody }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.applications.updateFacts(data.id, data.body, {
      headers,
    });
  });

export const withdrawApplication = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    await getBoard().me.applications.withdraw(data.id, { headers });
    return { ok: true as const };
  });

/** My application to a specific job — null when I haven't applied yet. */
export const myApplicationForJob = createServerFn({ method: 'GET' })
  .validator((input: { jobSlug: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      try {
        return await getBoard().jobs.myApplication(data.jobSlug, { headers });
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    }),
  );

function nativeApplySessionKey(): string {
  return ensureApplySession(
    getRequestHeader('cookie') ?? null,
    (name, value, options) => setCookie(name, value, options),
  );
}

/**
 * Stable native-Apply preparation seam. Every current starter calls this
 * before applying; Cavuno decides whether the browser must obtain a user-edge
 * approval receipt or can continue directly.
 */
export const prepareApplyToJob = createServerFn({ method: 'POST' })
  .validator((input: { jobSlug: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    setResponseHeader('cache-control', 'no-store');
    return prepareNativeApply(
      getBoard().client,
      data.jobSlug,
      nativeApplySessionKey(),
      headers,
    );
  });

/** Native apply — creates (or returns the existing) application for a job. */
export const applyToJob = createServerFn({ method: 'POST' })
  .validator(
    (input: { jobSlug: string; body?: ApplyBody; approvalReceipt?: string }) =>
      input,
  )
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    setResponseHeader('cache-control', 'no-store');
    return submitNativeApply(
      getBoard().client,
      data.jobSlug,
      data.body,
      data.approvalReceipt,
      nativeApplySessionKey(),
      headers,
    );
  });

/** Attach a resume file to an application — client posts FormData (`resume`). */
export const uploadApplicationResume = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    const jobSlug = data.get('jobSlug');
    if (typeof jobSlug !== 'string' || !jobSlug) {
      throw new Error('Expected a jobSlug');
    }
    const file = data.get('resume');
    if (!(file instanceof File)) {
      throw new Error('Expected a resume file');
    }
    return { jobSlug, file };
  })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().jobs.uploadApplicationResume(
      data.jobSlug,
      data.file,
      undefined,
      { headers },
    );
  });
