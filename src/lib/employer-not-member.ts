/**
 * The caller holds no approved membership of the company they asked for —
 * `employer_not_member` (403) from any `me/companies/{slug}` read.
 *
 * `gatedRead` recognises the wire code server-side, while the `BoardApiError`
 * shape still exists, and rethrows the signal below so the refusal survives the
 * server-function boundary. Matching the API's message instead would couple
 * this repo to a default parameter another repo is free to reword, with nothing
 * to catch the break.
 *
 * Same shape as `CANDIDATE_PAYWALL_SIGNAL`, and it lives in `lib/` for the same
 * reason: the loader helper that reads it ships to the client, so the constant
 * must not drag a `server/` module into the shared shell.
 */

/** The wire code, exactly as the API sends it. */
export const EMPLOYER_NOT_MEMBER_CODE = 'employer_not_member';

/** The signal `gatedRead` rethrows, read by `employer-loader-auth.ts`. */
export const EMPLOYER_NOT_MEMBER = 'EMPLOYER_NOT_MEMBER';
