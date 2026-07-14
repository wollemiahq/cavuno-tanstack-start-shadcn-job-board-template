import { isBoardApiError } from '@cavuno/board';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import {
  toCreateJobPostingInput,
  type JobPostingFormInput,
} from '../lib/post-form';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import type { JobPostingResult } from '@cavuno/board';

/** The board's job-posting plans (for the wizard's plan step). */
export const getPostPlans = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (h) =>
      getBoard().jobPosting.plans(undefined, { headers: h }),
    ),
  );

/** The flat form fields the wizard collects. */
export type SubmitJobInput = JobPostingFormInput;

export type SubmitJobResult =
  | { ok: true; result: JobPostingResult }
  | { ok: false; message: string };

/**
 * Submit a job to the board. Maps the flat form into the SDK's CreateJobPostingInput
 * and returns the status-discriminated result (the client redirects on `checkout`).
 * A rejected submission throws a `BoardApiError`, surfaced here as `{ ok: false }`.
 */
export const submitJobPosting = createServerFn({ method: 'POST' })
  .validator((input: SubmitJobInput) => input)
  .middleware([boardAccessMiddleware])
  .handler(
    ({ data, context }): Promise<SubmitJobResult> =>
      gatedRead(context, async (h): Promise<SubmitJobResult> => {
        try {
          const result = await getBoard().jobPosting.create(
            toCreateJobPostingInput(data),
            { headers: h },
          );
          return { ok: true, result };
        } catch (error) {
          if (isBoardApiError(error)) {
            return { ok: false, message: error.message };
          }
          throw error;
        }
      }),
  );

/** A stored logo (its `publicUrl` becomes the submission's `logoUrl`), or a reason it failed. */
export type LogoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string };

/**
 * Upload a logo file for the wizard. The browser posts the picked `File` as
 * FormData; the SDK stores it (256×256 WebP) and returns the `publicUrl`.
 */
export const uploadLogo = createServerFn({ method: 'POST' })
  // FormData passes through verbatim — the Cloudflare Workers adapter keeps the
  // native multipart body intact. Do NOT "simplify" this to a JSON validator.
  .validator((data: FormData) => data)
  .middleware([boardAccessMiddleware])
  .handler(
    ({ data, context }): Promise<LogoResult> =>
      gatedRead(context, async (h): Promise<LogoResult> => {
        const file = data.get('file');
        if (!(file instanceof File)) {
          return { ok: false, message: m.postJob_chooseImageError() };
        }
        try {
          const { publicUrl } = await getBoard().jobPosting.uploadLogo(file, {
            headers: h,
          });
          return { ok: true, publicUrl };
        } catch (error) {
          if (isBoardApiError(error))
            return { ok: false, message: error.message };
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
  .handler(
    ({ data, context }): Promise<LogoResult> =>
      gatedRead(context, async (h): Promise<LogoResult> => {
        try {
          const { publicUrl } = await getBoard().jobPosting.fetchLogoByDomain(
            data.domain,
            { headers: h },
          );
          return { ok: true, publicUrl };
        } catch (error) {
          if (isBoardApiError(error)) {
            return {
              ok: false,
              message:
                error.code === 'job_posting_logo_not_found'
                  ? m.postJob_logoNotFoundError()
                  : error.message,
            };
          }
          throw error;
        }
      }),
  );
