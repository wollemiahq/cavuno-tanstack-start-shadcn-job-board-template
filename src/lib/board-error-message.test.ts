import { BOARD_API_ERROR_CODES } from '@cavuno/board';
import { describe, expect, it } from 'vitest';

import { boardErrorMessage, CODE_MESSAGES } from './board-error-message';

/** Codes this repo's own server fns invent (not on the wire contract). */
const APP_LOCAL_CODES = ['unauthorized', 'invalid_file', 'unknown'];

describe('board error code map', () => {
  it('every mapped key is a real SDK code or a declared app-local code', () => {
    const known = new Set<string>([
      ...BOARD_API_ERROR_CODES,
      ...APP_LOCAL_CODES,
    ]);
    const impostors = Object.keys(CODE_MESSAGES).filter((k) => !known.has(k));
    // Guessed code names compile fine and silently render the generic
    // line for every real failure — this pin makes that a red test.
    expect(impostors).toEqual([]);
  });

  it('covers every code the employer + posting flows actually raise', () => {
    // These are reachable from the swapped call sites (auth, dashboard,
    // onboarding, post-job, checkout). Falling out of the map demotes a
    // specific sentence to the generic line — e.g. "job limit reached"
    // becoming indistinguishable from a network blip.
    const reachable = [
      'employer_job_slug_taken',
      'employer_jobs_quota_exceeded',
      'employer_payment_required',
      'employer_checkout_failed',
      'plan_upgrade_required',
      'employer_company_name_taken',
      'employer_company_exists',
      'employer_company_not_found',
      'employer_job_not_found',
      'employer_not_member',
      'job_posting_rejected',
      'job_posting_logo_not_found',
      'job_posting_logo_lookup_unavailable',
      'validation_payload_too_large',
      'auth_forbidden',
      'invalid_current_password',
      'same_email',
      'email_taken',
      'invalid_token',
      'last_admin',
      'not_company_admin',
      'company_deletion_disabled',
      'already_member',
      'already_invited',
      'invalid_email',
      'candidate_role',
      'messaging_talent_access_required',
      'talent_access_required',
      'talent_access_unavailable',
      'company_required',
      'already_on_plan',
      'stripe_not_connected',
    ];
    const unmapped = reachable.filter((code) => !(code in CODE_MESSAGES));
    expect(unmapped).toEqual([]);
  });

  it('resolves a real auth failure to its specific copy', () => {
    expect(boardErrorMessage({ code: 'board_auth_invalid_credentials' })).toBe(
      'Wrong email or password.',
    );
  });

  it('unknown codes get the generic line, never the wire message', () => {
    expect(boardErrorMessage({ code: 'space_weather', message: 'wire' })).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
