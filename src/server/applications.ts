import {
  isBoardApiError,
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
import { requireVerifiedBoardUser } from './me-verification';
import {
  ensureApplySession,
  prepareNativeApply,
  submitNativeApply,
} from './native-apply';

import { searchString } from '@/lib/pagination';

/** Bearer + board-access grant for one gated `/me/*` or authed apply call. */
function authedHeaders(context: SessionContext & BoardAccessContext) {
  return { ...context.authHeaders, ...context.boardAccessHeaders };
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
      getBoard(),
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
      getBoard(),
      data.jobSlug,
      data.body,
      data.approvalReceipt,
      nativeApplySessionKey(),
      headers,
    );
  });

/**
 * Guest apply — anonymous native apply (ADR-0037 §4). Deliberately WITHOUT
 * `requireSessionMiddleware`: the platform accepts `auth: ['board_user',
 * 'none']` on this route and only rejects an anonymous applicant when the
 * board's registration wall is on, so a starter that forced sign-in here
 * lost every application on the 129 wall-off boards.
 *
 * Returns a discriminated result instead of throwing: `BoardApiError` does
 * not survive the TanStack server-fn RPC boundary (see `message-error.ts`),
 * and the guest form needs to tell "this board requires an account" apart
 * from a generic failure.
 */
export type GuestApplyResult =
  | { ok: true }
  | { ok: false; reason: 'guest_not_allowed' | 'failed' };

export const applyToJobAsGuest = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      jobSlug: string;
      name?: string;
      email: string;
      coverNote?: string;
    }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(async ({ data, context }): Promise<GuestApplyResult> => {
    setResponseHeader('cache-control', 'no-store');
    try {
      await submitNativeApply(
        getBoard(),
        data.jobSlug,
        { name: data.name, email: data.email, coverNote: data.coverNote },
        undefined,
        nativeApplySessionKey(),
        context.boardAccessHeaders,
      );
      return { ok: true };
    } catch (error) {
      // A walled board 403s this; every other failure is generic to the
      // applicant (the wire sentence is English and never displayed).
      return {
        ok: false,
        reason:
          isBoardApiError(error) &&
          error.code === 'applications_guest_not_allowed'
            ? 'guest_not_allowed'
            : 'failed',
      };
    }
  });

/** Attach a resume file to an application — client posts FormData (`resume`). */
export const uploadApplicationResume = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    const jobSlug = searchString(data.get('jobSlug'));
    if (!jobSlug) {
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
