/**
 * Authenticated server functions — the `/account` candidate dashboard.
 * Auth is enforced HERE, per function, via the session middleware (never
 * in `beforeLoad` alone). Each wraps a `board.me.*` call with the bearer
 * headers the session middleware resolved, plus the board-access grant the
 * board-access middleware resolved (so a password-protected board answers).
 */
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import {
  requireSessionMiddleware,
  sessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';
import { gatedRead } from './board-access';

import type {
  AlertBody,
  CreateEducationBody,
  CreateExperienceBody,
  UpdateCandidateProfileBody,
  UpdateEducationBody,
  UpdateExperienceBody,
} from '@cavuno/board';

/** Additive profile field until the starter's pinned SDK publishes it. */
type UpdateCandidateProfileWithCountryBody = UpdateCandidateProfileBody & {
  countryCode?: string | null;
};

/** Bearer + board-access grant for one gated `/me/*` call. */
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

/** Session probe for layouts/headers: null when signed out (or walled). */
export const getSessionUser = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware, boardAccessMiddleware])
  .handler(async ({ context }) => {
    if (!context.session) return null;
    try {
      return await getBoard().me.retrieve(undefined, {
        headers: authedHeaders(context),
      });
    } catch {
      return null;
    }
  });

/** Everything the `/account` page renders, fetched in parallel. */
export const getAccount = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async () => {
      const board = getBoard();
      const headers = authedHeaders(context);
      const me = await requireVerifiedBoardUser(headers);
      const [
        profile,
        experience,
        education,
        skills,
        languages,
        savedJobs,
        resume,
      ] = await Promise.all([
        board.me.profile.retrieve(undefined, { headers }),
        board.me.profile.listExperience({ headers }),
        board.me.profile.listEducation({ headers }),
        board.me.profile.listSkills({ headers }),
        board.me.profile.listLanguages({ headers }),
        board.me.savedJobs.list({ limit: 50 }, { headers }),
        board.me.resume.retrieve({ headers }),
      ]);
      return {
        me,
        profile,
        experience,
        education,
        skills,
        languages,
        savedJobs,
        resume,
      };
    }),
  );

/**
 * Saved jobs only — the `/saved-jobs` page's loader. Kept lean on purpose:
 * `getAccount` fans out to seven parallel `/me/*` calls where any single
 * rejection would fail the whole route, so the saved page fetches just the one
 * slice it renders. Filters out saved rows whose job has since been
 * unpublished/expired (`job` is nulled by the API) so a stale entry can't crash
 * the card mapper.
 */
export const getSavedJobs = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      const savedJobs = await getBoard().me.savedJobs.list(
        { limit: 50 },
        { headers },
      );
      return {
        ...savedJobs,
        data: savedJobs.data.filter((saved) => saved.job != null),
      };
    }),
  );

/**
 * Job matches — `/matches`. Profile skills + resume
 * parseStatus ride along so the empty state can CTA without a hint
 * field on the list.
 */
export const getRecommendedJobs = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      const board = getBoard();
      const [recommended, skills, resume] = await Promise.all([
        board.me.recommendedJobs.list({ limit: 20 }, { headers }),
        board.me.profile.listSkills({ headers }),
        board.me.resume.retrieve({ headers }),
      ]);
      return {
        ...recommended,
        data: recommended.data.filter((item) => item.job != null),
        skillCount: skills.data.length,
        parseStatus: resume.parseStatus,
        resume,
      };
    }),
  );

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((input: UpdateCandidateProfileWithCountryBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    // The field is already part of Cavuno's additive HTTP contract. The
    // current starter SDK predates its generated type, so keep the one narrow
    // compatibility cast at the server boundary rather than dropping it.
    return getBoard().me.profile.update(
      data as UpdateCandidateProfileBody,
      undefined,
      { headers },
    );
  });

/** Live handle-availability check for the profile form. */
export const checkHandle = createServerFn({ method: 'GET' })
  .validator((input: { handle: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.handleAvailable(data.handle, { headers });
  });

export const createExperience = createServerFn({ method: 'POST' })
  .validator((input: CreateExperienceBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.createExperience(data, { headers });
  });

export const updateExperience = createServerFn({ method: 'POST' })
  .validator((input: { id: string; body: UpdateExperienceBody }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.updateExperience(data.id, data.body, {
      headers,
    });
  });

export const deleteExperience = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    await getBoard().me.profile.deleteExperience(data.id, { headers });
    return { ok: true as const };
  });

export const createEducation = createServerFn({ method: 'POST' })
  .validator((input: CreateEducationBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.createEducation(data, { headers });
  });

export const updateEducation = createServerFn({ method: 'POST' })
  .validator((input: { id: string; body: UpdateEducationBody }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.updateEducation(data.id, data.body, {
      headers,
    });
  });

export const deleteEducation = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    await getBoard().me.profile.deleteEducation(data.id, { headers });
    return { ok: true as const };
  });

/** Skills are replaced in full (whole-set PUT). */
export const replaceSkills = createServerFn({ method: 'POST' })
  .validator((input: { skills: string[] }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.updateSkills(data, { headers });
  });

/** Languages are replaced in full (whole-set PUT). */
export const replaceLanguages = createServerFn({ method: 'POST' })
  .validator(
    (input: { languages: { name: string; proficiency: string }[] }) => input,
  )
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.updateLanguages(data, { headers });
  });

/** Avatar upload — the client posts FormData with an `avatar` file. */
export const uploadAvatar = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    const file = data.get('avatar');
    if (!(file instanceof File)) {
      throw new Error('Expected an avatar file');
    }
    return file;
  })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.uploadAvatar(data, { headers });
  });

/** Irreversible: deletes the candidate and all their data. */
export const deleteAccount = createServerFn({ method: 'POST' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    await getBoard().me.delete({ headers });
    return { ok: true as const };
  });

export const saveJob = createServerFn({ method: 'POST' })
  .validator((input: { jobId: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.savedJobs.save(data, undefined, { headers });
  });

export const unsaveJob = createServerFn({ method: 'POST' })
  .validator((input: { jobId: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    await getBoard().me.savedJobs.unsave(data.jobId, undefined, { headers });
    return { ok: true as const };
  });

// ── Resume (onboarding async parse pipeline) ─────────────────────────────────

/** Current resume state: parse status + stored file. Poll after an upload. */
export const getResume = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.resume.retrieve({ headers });
    }),
  );

/** Resume upload — the client posts FormData with a `resume` file. */
export const uploadResume = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    const file = data.get('resume');
    if (!(file instanceof File)) {
      throw new Error('Expected a resume file');
    }
    const keepResumeOnFile = data.get('keepResumeOnFile') === 'true';
    return { file, keepResumeOnFile };
  })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.resume.upload(
      data.file,
      { keepResumeOnFile: data.keepResumeOnFile },
      { headers },
    );
  });

/** GDPR erasure — delete the stored blob + withdraw keep-on-file consent. */
export const deleteResume = createServerFn({ method: 'POST' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    await getBoard().me.resume.delete({ headers });
    return { ok: true as const };
  });

// ── Job-alert management (authenticated /me/alerts CRUD) ──────────────────────

export const getMyAlerts = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.alerts.list({ headers });
    }),
  );

export const createMyAlert = createServerFn({ method: 'POST' })
  .validator((input: AlertBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.alerts.create(data, { headers });
  });

/** Alerts are replaced in full (whole-object PUT). */
export const updateMyAlert = createServerFn({ method: 'POST' })
  .validator((input: { id: string; body: AlertBody }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.alerts.update(data.id, data.body, { headers });
  });

export const deleteMyAlert = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    await getBoard().me.alerts.remove(data.id, { headers });
    return { ok: true as const };
  });
