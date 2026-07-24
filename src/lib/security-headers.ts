/**
 * Low-risk headers the starter can apply to every response without knowing a
 * tenant's integrations or deployment domain.
 *
 * Deliberately absent here: CSP (tenant media, Stripe, and inline
 * bootstraps need a per-deployment policy), framing headers (`/embed/jobs`
 * must remain embeddable), HSTS (operator/domain policy), and broad browser
 * feature restrictions that could block an adopter's customization.
 */
export const BASELINE_SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
} as const;

/** Add the starter baseline while preserving any stricter route override. */
export function withBaselineSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(BASELINE_SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
