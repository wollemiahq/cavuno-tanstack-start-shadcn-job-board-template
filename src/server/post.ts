import { createServerFn } from '@tanstack/react-start'

import { isBoardApiError } from '@cavuno/board'

import { boardAccessMiddleware } from '../lib/board-access-middleware'
import { getBoard } from '../lib/board'
import { gatedRead } from './board-access'

import type { CreateJobPostingInput, JobPostingResult } from '@cavuno/board'

/** The board's job-posting plans (for the wizard's plan step). */
export const getPostPlans = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (h) => getBoard().jobPosting.plans(undefined, { headers: h })),
  )

/** The flat form fields the wizard collects. */
export type SubmitJobInput = {
  companyName: string
  companyWebsite?: string
  contactName: string
  contactEmail: string
  title: string
  description: string
  employmentType: string
  remoteOption: string
  applicationUrl: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  selectedPlan?: string
  logoUrl?: string
}

export type SubmitJobResult =
  | { ok: true; result: JobPostingResult }
  | { ok: false; message: string }

/**
 * Submit a job to the board. Maps the flat form into the SDK's CreateJobPostingInput
 * and returns the status-discriminated result (the client redirects on `checkout`).
 * A rejected submission throws a `BoardApiError`, surfaced here as `{ ok: false }`.
 */
export const submitJobPosting = createServerFn({ method: 'POST' })
  .validator((input: SubmitJobInput) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }): Promise<SubmitJobResult> =>
    gatedRead(context, async (h): Promise<SubmitJobResult> => {
      const salaryRangeEnabled =
        data.salaryMin !== undefined && data.salaryMax !== undefined

      const input: CreateJobPostingInput = {
        submission: {
          companyName: data.companyName,
          companyWebsite: data.companyWebsite,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          title: data.title,
          description: data.description,
          employmentType: data.employmentType,
          remoteOption: data.remoteOption,
          officeLocations: [],
          applicationUrl: data.applicationUrl,
          salaryRangeEnabled,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          salaryCurrency: salaryRangeEnabled ? data.salaryCurrency : undefined,
          selectedPlan: data.selectedPlan,
        },
        logoUrl: data.logoUrl,
      }

      try {
        const result = await getBoard().jobPosting.create(input, { headers: h })
        return { ok: true, result }
      } catch (error) {
        if (isBoardApiError(error)) {
          return { ok: false, message: error.message }
        }
        throw error
      }
    }),
  )

/** A stored logo (its `publicUrl` becomes the submission's `logoUrl`), or a reason it failed. */
export type LogoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string }

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
      const file = data.get('file')
      if (!(file instanceof File)) {
        return { ok: false, message: 'Choose an image file to upload.' }
      }
      try {
        const { publicUrl } = await getBoard().jobPosting.uploadLogo(file, {
          headers: h,
        })
        return { ok: true, publicUrl }
      } catch (error) {
        if (isBoardApiError(error)) return { ok: false, message: error.message }
        throw error
      }
    }),
  )

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
        )
        return { ok: true, publicUrl }
      } catch (error) {
        if (isBoardApiError(error)) {
          return {
            ok: false,
            message:
              error.code === 'job_posting_logo_not_found'
                ? 'No logo found for that website.'
                : error.message,
          }
        }
        throw error
      }
    }),
  )
