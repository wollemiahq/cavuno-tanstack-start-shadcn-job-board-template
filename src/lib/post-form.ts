/**
 * Pure helpers for the post-a-job form (src/routes/post.tsx). Kept out of
 * the route so the URL-normalisation and rich-text-emptiness seams can be
 * unit-tested without rendering the form.
 */

import type { CreateJobPostingInput } from '@cavuno/board';

/** The periods the API quotes `salaryMin`/`salaryMax` against. */
export const SALARY_TIMEFRAMES = [
  'per_year',
  'per_month',
  'per_week',
  'per_day',
  'per_hour',
] as const;

export type SalaryTimeframe = (typeof SALARY_TIMEFRAMES)[number];

export const DEFAULT_SALARY_TIMEFRAME: SalaryTimeframe = 'per_year';

export type JobPostingFormInput = {
  companyName: string;
  companyWebsite?: string;
  contactName: string;
  contactEmail: string;
  title: string;
  description: string;
  employmentType: string;
  remoteOption: string;
  applicationUrl: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  /** Period the figures are quoted against; only sent with a full range. */
  salaryTimeframe?: SalaryTimeframe;
  selectedPlan?: string;
  logoUrl?: string;
};

export function toCreateJobPostingInput(
  data: JobPostingFormInput,
): CreateJobPostingInput {
  const salaryRangeEnabled =
    data.salaryMin !== undefined && data.salaryMax !== undefined;

  return {
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
      // Rides with the range, exactly like the currency — a timeframe without
      // figures to qualify says nothing.
      salaryTimeframe: salaryRangeEnabled ? data.salaryTimeframe : undefined,
      selectedPlan: data.selectedPlan,
    },
    logoUrl: data.logoUrl,
  };
}

/**
 * Prepend `https://` to a bare domain typed into a URL field that renders
 * with an `https://` leading addon (the poster types `acme.com`). A value
 * that already carries an `http(s)` protocol is returned untouched; an
 * empty value becomes `undefined` so the field submits as absent.
 */
export function ensureProtocol(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Strip any protocol and path, leaving the bare host (for logo lookup). */
export function toDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .split('/')[0];
}

/** Whether a value looks enough like a domain to auto-fetch a logo for it. */
export function looksLikeDomain(value: string): boolean {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(toDomain(value));
}

/**
 * Normalise a URL typed into the rich-text link popover: bare domains gain
 * `https://`, existing `http(s)` URLs pass through, and any other explicit
 * scheme (`javascript:`, `mailto:`, …) is rejected so a link mark can never
 * carry a script URL. Empty input returns `undefined` (used to unset).
 */
export function sanitizeLinkUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // A scheme is letters/digits with no dot before the colon; a bare
  // `host:port` (dot before the colon) is not a scheme and is allowed.
  if (/^[a-z][a-z0-9+-]*:/i.test(trimmed)) return undefined;
  return `https://${trimmed}`;
}

/**
 * Whether rich-text HTML from the editor carries no visible content — an
 * empty Tiptap document is `<p></p>`. Used to enforce the (previously
 * `required`) description field before submitting.
 */
export function isRichTextEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .replace(/\s+/g, '');
  return text.length === 0;
}
