/**
 * Return-trip search on `/employers/companies/$slug` — Stripe success lands
 * with `checkout_success=1&job_id=…`, and the posting form adds `posted=1`
 * after a same-origin save so the list can point at the new row. A board that
 * requires job approval holds the post as a draft instead of publishing it,
 * which arrives as `posted=1&review=1`: the same new row, but awaiting the
 * operator's review rather than live. Saving an edit to an existing job
 * returns with `edited=1` instead.
 *
 * The flags are the number `1`, not the string `'1'`: the router
 * JSON-encodes a string that would parse as JSON, so `'1'` would reach the
 * address bar as `posted=%221%22`.
 */
import { searchString, type UrlSearchInput } from './pagination';

export type CompanyJobsSearch = {
  checkout_success?: 1;
  posted?: 1;
  review?: 1;
  edited?: 1;
  job_id?: string;
};

function flagEnabled(value: UrlSearchInput[string]): boolean {
  return value === '1' || value === 1 || value === true;
}

export function parseCompanyJobsSearch(
  search: UrlSearchInput,
): CompanyJobsSearch {
  const jobId = searchString(search.job_id);
  const result: CompanyJobsSearch = {};
  if (flagEnabled(search.checkout_success)) result.checkout_success = 1;
  if (flagEnabled(search.posted)) result.posted = 1;
  if (flagEnabled(search.review)) result.review = 1;
  if (flagEnabled(search.edited)) result.edited = 1;
  if (jobId) result.job_id = jobId;
  return result;
}
