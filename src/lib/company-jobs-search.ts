/**
 * Return-trip search on `/employers/companies/$slug` — Stripe success lands
 * with `checkout_success=1&job_id=…`, and the posting form adds `posted=1`
 * after a same-origin save so the list can point at the new row.
 */
import { searchString, type UrlSearchInput } from './pagination';

export type CompanyJobsSearch = {
  checkout_success?: '1';
  posted?: '1';
  job_id?: string;
};

function flagEnabled(value: UrlSearchInput[string]): boolean {
  return value === '1' || value === 1 || value === true;
}

export function parseCompanyJobsSearch(
  search: UrlSearchInput,
): CompanyJobsSearch {
  const jobId = searchString(search.job_id);
  return {
    ...(flagEnabled(search.checkout_success)
      ? { checkout_success: '1' as const }
      : {}),
    ...(flagEnabled(search.posted) ? { posted: '1' as const } : {}),
    ...(jobId ? { job_id: jobId } : {}),
  };
}
