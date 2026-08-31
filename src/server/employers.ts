import {
  isBoardApiError,
  type AcceptCompanyMemberInviteBody,
  type ConfirmWorkEmailBody,
  type CreateCompanyBody,
  type CreateCompanyMemberInviteBody,
  type CreateEmployerJobBody,
  type CreateTalentListBody,
  type EmployerCheckoutBody,
  type EmployerCompanySearchQuery,
  type SendWorkEmailBody,
  type UpdateCompanyMemberRoleBody,
  type UpdateEmployerCompanyBody,
  type UpdateEmployerJobBody,
  type UpdateTalentListBody,
} from '@cavuno/board';
/**
 * Authenticated server functions — the `/employers/dashboard` employer surface
 * (the `board.me.companies.*` SDK, new in @cavuno/board 1.21.0). Auth is
 * enforced per function via the session middleware; each wraps a
 * `board.me.companies.*` call with the bearer headers the session middleware
 * resolved plus the board-access grant the board-access middleware resolved (so
 * a password-protected board answers).
 *
 * Reads used by route loaders are `gatedRead`-wrapped: a password wall
 * (`board_password_required`) redirects to `/password`; anything else bubbles
 * to the loader. Interactive mutations return a discriminated `{ ok }` result so
 * the API's message (slug taken, payment required, stage limit, …) reaches the
 * form — the grant simply rides along (established by the page load).
 */
import { createMiddleware, createServerFn } from '@tanstack/react-start';

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

import { searchString } from '@/lib/pagination';
import type { TalentListFilters } from '@/lib/talent-search';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // `message` is wire English — clients resolve display copy from `code`
    // via boardErrorMessage and must not render the message directly.
    return isBoardApiError(error)
      ? { ok: false, code: error.code, message: error.message }
      : { ok: false, code: 'unknown', message: 'Something went wrong.' };
  }
}

type ErrorDetails = { email?: string };
function invitedEmailFromDetails<T>(details: T): string | undefined {
  if (details === null || details === undefined || Object(details) !== details)
    return undefined;
  // SAFETY: Board API error details are object records; only the optional
  // email field is read and decoded before being returned.
  const row = details as ErrorDetails;
  return searchString(row.email);
}

/** Bearer + board-access grant for one gated `/me/companies/*` call. */
function authedHeaders(context: SessionContext & BoardAccessContext) {
  return { ...context.authHeaders, ...context.boardAccessHeaders };
}

/** Primary-email gate for every authenticated employer workspace operation. */
const verifiedBoardUserMiddleware = createMiddleware({ type: 'function' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .server(async ({ next, context }) => {
    const me = await getBoard().me.retrieve(undefined, {
      headers: authedHeaders(context),
    });
    if (!me.emailVerified) throw new Error('EMAIL_UNVERIFIED');
    return next({ context });
  });

// ── Companies & claims ──────────────────────────────────────────────────────

/** Every company the signed-in board user manages or has claimed. */
export const listCompanies = createServerFn({ method: 'GET' })
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.list({ headers: authedHeaders(context) }),
    ),
  );

export const searchCompanies = createServerFn({ method: 'GET' })
  .validator((input: EmployerCompanySearchQuery) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.search(data, { headers: authedHeaders(context) }),
    ),
  );

export const createCompany = createServerFn({ method: 'POST' })
  .validator((input: CreateCompanyBody) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.create(data, { headers: authedHeaders(context) }),
    ),
  );

export const claimCompany = createServerFn({ method: 'POST' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.claim(data.slug, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const cancelClaim = createServerFn({ method: 'POST' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.cancelClaim(data.slug, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );

/**
 * The signed-in manager's editable company record (`board.me.companies.retrieve`,
 * an `EmployerCompany`). Unlike the public `companies.retrieve`, this returns the
 * write-side fields the profile form edits — `summary` (tagline), the social
 * URLs, and `logoUrl` — so the form prefills from the same shape it submits. A
 * gated read like the workspace.
 */
export const getEmployerCompany = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.retrieve(data.slug, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const updateCompany = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; body: UpdateEmployerCompanyBody }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.update(data.slug, data.body, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const deleteCompany = createServerFn({ method: 'POST' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.delete(data.slug, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );

export const listCompanyMembers = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.listMembers(data.slug, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const updateCompanyMemberRole = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      slug: string;
      memberId: string;
      body: UpdateCompanyMemberRoleBody;
    }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.updateMemberRole(data.slug, data.memberId, data.body, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );

export const removeCompanyMember = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; memberId: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.removeMember(data.slug, data.memberId, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );

export const leaveCompany = createServerFn({ method: 'POST' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.leave(data.slug, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );

export const listCompanyInvites = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.listInvites(data.slug, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const createCompanyInvite = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; body: CreateCompanyMemberInviteBody }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.createInvite(data.slug, data.body, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const revokeCompanyInvite = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; inviteId: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.revokeInvite(data.slug, data.inviteId, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );

export const acceptCompanyInvite = createServerFn({ method: 'POST' })
  .validator((input: AcceptCompanyMemberInviteBody) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(async ({ data, context }) => {
    try {
      return {
        ok: true as const,
        data: await getBoard().me.acceptInvite(data, {
          headers: authedHeaders(context),
        }),
      };
    } catch (error) {
      if (isBoardApiError(error)) {
        const email = invitedEmailFromDetails(error.details);
        const body = {
          ok: false as const,
          code: error.code,
          message: error.message,
        };
        if (email) return { ...body, email };
        return {
          ...body,
        };
      }
      return {
        ok: false as const,
        code: 'unknown',
        message: 'Something went wrong.',
      };
    }
  });

/**
 * Company logo upload — the client posts FormData with a `slug` and a `logo`
 * file, mirroring the candidate avatar flow (`uploadAvatar`). Wraps
 * `board.me.companies.uploadLogo(slug, file)`, which returns the updated
 * `EmployerCompany` (its new `logoUrl`); the caller invalidates to repaint.
 */
export const uploadCompanyLogo = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    const slug = searchString(data.get('slug'));
    if (!slug) {
      throw new Error('Expected a company slug');
    }
    const file = data.get('logo');
    if (!(file instanceof File)) {
      throw new Error('Expected a logo file');
    }
    return { slug, file };
  })
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    getBoard().me.companies.uploadLogo(data.slug, data.file, {
      headers: authedHeaders(context),
    }),
  );

export const sendWorkEmail = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; body: SendWorkEmailBody }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.workEmail.verify(data.slug, data.body, {
        headers: authedHeaders(context),
      }),
    ),
  );

/**
 * Confirm a work-email verification from the emailed link — the token IS the
 * authorization (the endpoint is `auth: ['none']` + open-allowlisted), so
 * there is NO session or board-access grant to carry, unlike every other
 * `/me/companies/*` call. Returns the membership in its new state (`approved`
 * on a domain match, else `awaiting_admin`). Powers `/auth/verify-work-email`.
 *
 * Hits the FLAT `POST /auth/verify-work-email`, not the slug-scoped
 * `/me/companies/:slug/work-email/confirm` this used to call. The emailed link
 * carries only a token, so there was never a slug to pass — we sent an empty
 * one and the route bailed to `verified=invalid`, which read to the employer
 * as "the link expired" on a perfectly good first click. The server ignored
 * the slug anyway: the token alone identifies the membership.
 */
export const confirmWorkEmail = createServerFn({ method: 'POST' })
  .validator((input: { body: ConfirmWorkEmailBody }) => input)
  .handler(({ data }) => run(() => getBoard().auth.verifyWorkEmail(data.body)));

// ── Jobs ────────────────────────────────────────────────────────────────────

/** The company-management page payload: the membership (company header +
 * edit-form prefill), the company's jobs (all statuses), and its reusable
 * billing options. */
export const getCompanyWorkspace = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      const board = getBoard();
      const [memberships, jobs, billingOptions, plans] = await Promise.all([
        board.me.companies.list({ headers }),
        board.me.companies.jobs.list(data.slug, undefined, { headers }),
        board.me.companies.billingOptions.list(data.slug, { headers }),
        // The public job-posting plans (the `billing.type: 'new'` checkout
        // options). Resilient: an empty list if the catalog read fails — the
        // picker still offers any reusable credits.
        board.jobPosting
          .plans(undefined, { headers })
          .then((result) => result.data)
          .catch(() => []),
      ]);
      const membership =
        memberships.data.find((m) => m.company.slug === data.slug) ?? null;
      return { slug: data.slug, membership, jobs, billingOptions, plans };
    }),
  );

/** One job's full detail (edit-form prefill). Gated read like the workspace. */
export const getJob = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; id: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.jobs.retrieve(data.slug, data.id, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const createJob = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; body: CreateEmployerJobBody }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.jobs.create(data.slug, data.body, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const updateJob = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; id: string; body: UpdateEmployerJobBody }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.jobs.update(data.slug, data.id, data.body, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const deleteJob = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; id: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.jobs.delete(data.slug, data.id, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );

export const publishJob = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; id: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.jobs.publish(data.slug, data.id, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const unpublishJob = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; id: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.jobs.unpublish(data.slug, data.id, {
        headers: authedHeaders(context),
      }),
    ),
  );

/** Pay for / publish a held draft. Returns the checkout result — when
 * `status === 'checkout'` the caller sends the buyer to `checkoutUrl`. */
export const checkoutJob = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; id: string; body: EmployerCheckoutBody }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.jobs.checkout(data.slug, data.id, data.body, {
        headers: authedHeaders(context),
      }),
    ),
  );

// ── Reporting — per-job stats + the company timeseries ──────────────────────

/**
 * Per-job reporting funnel for every job the company owns (views, apply
 * clicks, native applications), keyed by `jobId`. A gated read like the
 * workspace; carries no cache tags, so it stays no-store under the authed
 * read-cache policy. The endpoint zero-fills on an analytics outage and never
 * fails on stats, so a `0` means "no activity" OR "analytics briefly down".
 */
export const getEmployerJobStats = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.jobStats.retrieve(data.slug, {
        headers: authedHeaders(context),
      }),
    ),
  );

/**
 * Daily views + apply-clicks aggregated across the company's jobs, ascending
 * by date. Defaults to the API's last-30-days window when `since`/`until` are
 * omitted. Gated read, no cache tags — no-store like the per-job stats.
 */
export const getEmployerJobStatsTimeseries = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; since?: string; until?: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.jobStats.timeseries(
        data.slug,
        { since: data.since, until: data.until },
        { headers: authedHeaders(context) },
      ),
    ),
  );

// ── Reporting — company profile-page views ──────────────────────────────────

/**
 * The company's profile-page view total over the API's last-30-days window
 * (`/companies/{slug}` itself, tabs + bots excluded). A gated read like the
 * workspace; carries no cache tags, so it stays no-store under the authed
 * read-cache policy. The endpoint zero-fills on an analytics outage, so a `0`
 * means "no views" OR "analytics briefly down" — the surface renders an honest
 * empty state either way.
 */
export const getEmployerProfileStats = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.profileStats.retrieve(data.slug, {
        headers: authedHeaders(context),
      }),
    ),
  );

/**
 * Daily profile-page views, ascending by date. Defaults to the API's
 * last-30-days window when `since`/`until` are omitted. Gated read, no cache
 * tags — no-store like the summary retrieve.
 */
export const getEmployerProfileStatsTimeseries = createServerFn({
  method: 'GET',
})
  .validator((input: { slug: string; since?: string; until?: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.profileStats.timeseries(
        data.slug,
        { since: data.since, until: data.until },
        { headers: authedHeaders(context) },
      ),
    ),
  );

// ── ATS — applicants + pipeline stages ──────────────────────────────────────

/** One job's pipeline (job header + stage rail + applicants with timelines). */
export const getPipeline = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; job: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.applicants.list(
        data.slug,
        { job: data.job },
        { headers: authedHeaders(context) },
      ),
    ),
  );

export type SourcedRailItem = {
  id: string;
  sourcedAt: number;
  candidate: {
    id: string;
    displayName: string | null;
    headline: string | null;
  };
};

export const listEmployerJobs = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.jobs.list(data.slug, undefined, {
        headers: authedHeaders(context),
      }),
    ),
  );

export const listSourcedCandidates = createServerFn({ method: 'GET' })
  .validator((input: { slug: string; job: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.sourcedCandidates.list(
        data.slug,
        { job: data.job },
        { headers: authedHeaders(context) },
      ),
    ),
  );

export const saveSourcedCandidate = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; job: string; candidateBoardUserId: string }) =>
      input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.sourcedCandidates.add(
        data.slug,
        {
          job: data.job,
          candidateBoardUserId: data.candidateBoardUserId,
        },
        { headers: authedHeaders(context) },
      ),
    ),
  );

export type TalentListRecord = {
  id: string;
  object: 'talent_list';
  name: string;
  filters: TalentListFilters;
  jobId: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export const listTalentLists = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, () =>
      getBoard().me.companies.talentLists.list(data.slug, {
        headers: authedHeaders(context),
      }),
    ),
  );

/** Jobs + saved searches in one verified `/me` — talent directory chrome. */
export const getEmployerTalentWorkspace = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    const [jobs, lists] = await Promise.all([
      gatedRead(context, () =>
        getBoard().me.companies.jobs.list(data.slug, undefined, { headers }),
      ),
      gatedRead(context, () =>
        getBoard().me.companies.talentLists.list(data.slug, { headers }),
      ),
    ]);
    return { jobs, lists };
  });

export const createTalentList = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      slug: string;
      name: string;
      filters?: TalentListFilters;
      job?: string;
    }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() => {
      const body: CreateTalentListBody = { name: data.name };
      if (data.filters) body.filters = data.filters;
      if (data.job) body.job = data.job;
      return getBoard().me.companies.talentLists.create(data.slug, body, {
        headers: authedHeaders(context),
      });
    }),
  );

export const updateTalentList = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      slug: string;
      listId: string;
      name?: string;
      filters?: TalentListFilters;
      job?: string | null;
    }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() => {
      const body: UpdateTalentListBody = {};
      if (data.name !== undefined) body.name = data.name;
      if (data.filters !== undefined) body.filters = data.filters;
      if (data.job !== undefined) body.job = data.job;
      return getBoard().me.companies.talentLists.update(
        data.slug,
        data.listId,
        body,
        { headers: authedHeaders(context) },
      );
    }),
  );

export const deleteTalentList = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; listId: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.talentLists.remove(data.slug, data.listId, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );

export const convertSourcedCandidate = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; sourcedId: string; stage: string }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.sourcedCandidates.convert(
        data.slug,
        data.sourcedId,
        { stage: data.stage },
        { headers: authedHeaders(context) },
      ),
    ),
  );

export const moveApplicant = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; applicationId: string; stageId: string }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.applicants.move(
          data.slug,
          data.applicationId,
          { stageId: data.stageId },
          { headers: authedHeaders(context) },
        )
        .then(() => null),
    ),
  );

export const bulkRejectApplicants = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; applicationIds: string[] }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.applicants.bulkReject(
          data.slug,
          { applicationIds: data.applicationIds },
          { headers: authedHeaders(context) },
        )
        .then(() => null),
    ),
  );

export const addApplicantNote = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; applicationId: string; body: string }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.applicants.addNote(
          data.slug,
          data.applicationId,
          { body: data.body },
          { headers: authedHeaders(context) },
        )
        .then(() => null),
    ),
  );

export const createStage = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; jobId: string; label: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.pipelineStages.create(
          data.slug,
          { jobId: data.jobId, label: data.label },
          { headers: authedHeaders(context) },
        )
        .then(() => null),
    ),
  );

export const renameStage = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; stageId: string; label: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.pipelineStages.update(
          data.slug,
          data.stageId,
          { label: data.label },
          { headers: authedHeaders(context) },
        )
        .then(() => null),
    ),
  );

export const removeStage = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; stageId: string }) => input)
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard()
        .me.companies.pipelineStages.remove(data.slug, data.stageId, {
          headers: authedHeaders(context),
        })
        .then(() => null),
    ),
  );
