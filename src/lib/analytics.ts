/**
 * P2 starter analytics (board-frontend-cutover runbook): the hosted
 * board's Tinybird flock wiring, mirrored so dashboards and per-job
 * employer stats stay continuous at cutover. Events are keyed by
 * tenant_id = board slug (the script tag's data-tenant-id) and — for
 * apply clicks — by the Convex job _id, exactly like the hosted
 * `job-apply-button` components.
 */

declare global {
  interface Window {
    Tinybird?: {
      trackEvent: (name: string, payload: Record<string, unknown>) => void;
    };
  }
}

/** Tinybird events API behind the first-party `/t` proxy (hosted parity). */
export const TINYBIRD_API_HOST = 'https://api.us-east.aws.tinybird.co';

/**
 * Map a `/t/*` request URL onto the Tinybird API, preserving the path
 * below the prefix and the full query string. Pure so the proxy contract
 * is testable without a server.
 */
export function tinybirdProxyTarget(url: URL): string {
  const path = url.pathname.replace(/^\/t/, '');
  return `${TINYBIRD_API_HOST}${path}${url.search}`;
}

/**
 * Record an apply click for employer reporting. Payload mirrors the
 * hosted board byte-for-byte: `job_id` is the Convex job _id (per-job
 * employer stats join on it), `company_slug` spreads in only when
 * present. A tracker failure must never break the apply flow.
 */
export function trackJobApplyClick({
  jobId,
  companySlug,
}: {
  jobId: string;
  companySlug?: string;
}): void {
  try {
    window.Tinybird?.trackEvent('job_apply_click', {
      job_id: jobId,
      ...(companySlug ? { company_slug: companySlug } : {}),
    });
  } catch (error) {
    console.warn('[board-analytics] Failed to record apply click', error);
  }
}
