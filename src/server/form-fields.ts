/**
 * Interactive reads and writes of the operator-defined fields on the three
 * forms: collection choices for a picker, and the company and candidate
 * custom-field and collection-selection writes. Only the form components
 * import this module, so these server-function stubs load with those routes
 * rather than with every page. Auth and the board-access grant are enforced
 * per function, like the rest of `src/server/`.
 */
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import { searchString } from '../lib/pagination';
import {
  requireSessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';
import { gatedRead } from './board-access';
import { run, verifiedBoardUserMiddleware } from './employers';
import { requireVerifiedBoardUser } from './me-verification';

import type {
  JobCollectionChoiceQuery,
  ProfileChoiceQuery,
  ReplaceProfileObjectReferencesBody,
  UpdateProfileFieldValuesBody,
} from '@cavuno/board';

/** Bearer + board-access grant for one gated `/me/*` call. */
function authedHeaders(context: SessionContext & BoardAccessContext) {
  return { ...context.authHeaders, ...context.boardAccessHeaders };
}

// ── Jobs ────────────────────────────────────────────────────────────────

/**
 * Active choices of one job collection field (benefits, tech stack, …) for
 * the employer job form's picker. A public read, gated like the others.
 */
export const getJobCollectionChoices = createServerFn({ method: 'GET' })
  .validator((input: { fieldKey: string } & JobCollectionChoiceQuery) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, (h) => {
      const { fieldKey, ...query } = data;
      return getBoard().jobs.collectionChoices(fieldKey, query, {
        headers: h,
      });
    }),
  );

// ── Company profile ─────────────────────────────────────────────────────

/** Additive write of the company's editable custom fields. */
export const updateCompanyCustomFields = createServerFn({ method: 'POST' })
  .validator(
    (input: { slug: string; body: UpdateProfileFieldValuesBody }) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.updateCustomFields(data.slug, data.body, {
        headers: authedHeaders(context),
      }),
    ),
  );

/**
 * Uploads one gallery image or file to an owner-editable company custom
 * field, as a draft the company form saves with its other custom fields.
 */
export const uploadCompanyCustomFieldFile = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) throw new Error('Expected FormData');
    const slug = searchString(data.get('slug'));
    const fieldKey = searchString(data.get('fieldKey'));
    const file = data.get('file');
    if (!slug || !fieldKey || !(file instanceof File)) {
      throw new Error('Expected a slug, a fieldKey and a file');
    }
    return { slug, fieldKey, file };
  })
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.uploadCustomFieldFile(
        data.slug,
        data.fieldKey,
        data.file,
        { headers: authedHeaders(context) },
      ),
    ),
  );

/** Replaces the company's complete editable collection selection set. */
export const updateCompanyObjectReferences = createServerFn({
  method: 'POST',
})
  .validator(
    (input: { slug: string; body: ReplaceProfileObjectReferencesBody }) =>
      input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) =>
    run(() =>
      getBoard().me.companies.updateObjectReferences(data.slug, data.body, {
        headers: authedHeaders(context),
      }),
    ),
  );

/** Active choices of one editable company collection field. */
export const listCompanyObjectReferenceChoices = createServerFn({
  method: 'GET',
})
  .validator(
    (input: { slug: string; fieldKey: string } & ProfileChoiceQuery) => input,
  )
  .middleware([verifiedBoardUserMiddleware])
  .handler(({ data, context }) => {
    const { slug, fieldKey, ...query } = data;
    return getBoard().me.companies.listObjectReferenceChoices(
      slug,
      fieldKey,
      query,
      { headers: authedHeaders(context) },
    );
  });

// ── Candidate profile ───────────────────────────────────────────────────

/** Additive write of the candidate's editable profile custom fields. */
export const updateProfileCustomFields = createServerFn({ method: 'POST' })
  .validator((input: UpdateProfileFieldValuesBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.updateCustomFields(data, { headers });
  });

/**
 * One gallery image or file for an owner-editable candidate custom field.
 * The client posts FormData with `fieldKey` and a `file`. The upload is a
 * draft until its ID is saved with `updateProfileCustomFields`.
 */
export const uploadProfileCustomFieldFile = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) throw new Error('Expected FormData');
    const fieldKey = searchString(data.get('fieldKey'));
    const file = data.get('file');
    if (!fieldKey || !(file instanceof File)) {
      throw new Error('Expected a fieldKey and a file');
    }
    return { fieldKey, file };
  })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return run(() =>
      getBoard().me.profile.uploadCustomFieldFile(data.fieldKey, data.file, {
        headers,
      }),
    );
  });

/** Replaces the candidate's complete editable collection selection set. */
export const updateProfileObjectReferences = createServerFn({
  method: 'POST',
})
  .validator((input: ReplaceProfileObjectReferencesBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return getBoard().me.profile.updateObjectReferences(data, { headers });
  });

/** Active choices of one editable candidate collection field. */
export const listProfileObjectReferenceChoices = createServerFn({
  method: 'GET',
})
  .validator((input: { fieldKey: string } & ProfileChoiceQuery) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ data, context }) => {
    const { fieldKey, ...query } = data;
    return getBoard().me.profile.listObjectReferenceChoices(fieldKey, query, {
      headers: authedHeaders(context),
    });
  });
