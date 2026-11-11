import { isBoardApiError } from '@cavuno/board';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import {
  toCreateJobPostingInput,
  type JobPostingFormInput,
} from '../lib/post-form';
import { gatedRead } from './board-access';
import { withCatalogFeatures } from './post-plans';

import type { JobPostingCheckoutStatus, JobPostingResult } from '@cavuno/board';

/** The board's job-posting plans (for the wizard's plan step). */
export const getPostPlans = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (h) => {
      const postingPlans = getBoard().jobPosting.plans(undefined, {
        headers: h,
      });
      const data = await withCatalogFeatures(
        postingPlans.then((result) => result.data),
        h,
      );
      return { ...(await postingPlans), data };
    }),
  );

/** The flat form fields the wizard collects. */
export type SubmitJobInput = JobPostingFormInput;

export type SubmitJobResult =
  | { ok: true; result: JobPostingResult }
  | { ok: false; code: string; message: string };

/**
 * Submit a job to the board. Maps the flat form into the SDK's CreateJobPostingInput
 * and returns the status-discriminated result (the client mounts
 * `embedded_checkout`).
 * A rejected submission throws a `BoardApiError`, surfaced here as `{ ok: false }`.
 */
export const submitJobPosting = createServerFn({ method: 'POST' })
  .validator((input: SubmitJobInput) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }): Promise<SubmitJobResult> =>
    gatedRead(context, async (h): Promise<SubmitJobResult> => {
      try {
        // Embedded: the buyer pays on the board instead of leaving for a
        // Stripe-hosted page, and a card payment completes in place.
        const input = toCreateJobPostingInput(data);
        const result = await getBoard().jobPosting.create(
          { ...input, checkoutUiMode: 'embedded_page' },
          { headers: h },
        );
        return { ok: true, result };
      } catch (error) {
        if (isBoardApiError(error)) {
          return { ok: false, code: error.code, message: error.message };
        }
        throw error;
      }
    }),
  );

/**
 * Payment and job state for a job-posting checkout session, read after
 * Stripe reports the embedded checkout complete. `awaiting_payment` until the
 * platform has recorded the payment, usually within seconds.
 */
export const getJobPostingCheckout = createServerFn({ method: 'GET' })
  .validator((input: { sessionId: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }): Promise<JobPostingCheckoutStatus> =>
    gatedRead(context, (h) =>
      getBoard().jobPosting.getCheckout(data.sessionId, {
        headers: h,
        cache: 'no-store',
      }),
    ),
  );

/** A stored logo (its `publicUrl` becomes the submission's `logoUrl`), or a reason it failed. */
export type LogoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; code: string; message: string };

/**
 * Upload a logo file for the wizard. The browser posts the picked `File` as
 * FormData; the SDK stores it (256×256 WebP) and returns the `publicUrl`.
 */
export const uploadLogo = createServerFn({ method: 'POST' })
  // FormData passes through verbatim — the Cloudflare Workers adapter keeps the
  // native multipart body intact. Do NOT "simplify" this to a JSON validator.
  .validator((data: FormData) => data)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }): Promise<LogoResult> =>
    gatedRead(context, async (h): Promise<LogoResult> => {
      const file = data.get('file');
      if (!(file instanceof File)) {
        return {
          ok: false,
          code: 'invalid_file',
          message: 'Choose an image file.',
        };
      }
      try {
        const { publicUrl } = await getBoard().jobPosting.uploadLogo(file, {
          headers: h,
        });
        return { ok: true, publicUrl };
      } catch (error) {
        if (isBoardApiError(error))
          return { ok: false, code: error.code, message: error.message };
        throw error;
      }
    }),
  );

/**
 * Fetch a logo by company domain via Brandfetch. The SDK stores the result and
 * returns the `publicUrl`; a missing logo (404) surfaces as a friendly message.
 */
export const fetchLogoByDomain = createServerFn({ method: 'POST' })
  .validator((input: { domain: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }): Promise<LogoResult> =>
    gatedRead(context, async (h): Promise<LogoResult> => {
      try {
        const { publicUrl } = await getBoard().jobPosting.fetchLogoByDomain(
          data.domain,
          { headers: h },
        );
        return { ok: true, publicUrl };
      } catch (error) {
        if (isBoardApiError(error)) {
          // Wire code + wire message; the client resolves display copy
          // from the code (boardErrorMessage maps logo codes too).
          return { ok: false, code: error.code, message: error.message };
        }
        throw error;
      }
    }),
  );
