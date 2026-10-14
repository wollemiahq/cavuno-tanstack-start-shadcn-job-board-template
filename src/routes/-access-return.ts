/**
 * The `/account/access` return-path helpers, shared by the route loader and the
 * page. Kept out of the page module so the route file can import them without
 * pulling the page (and its embedded checkout) into the shared client entry.
 */
import { safeRedirectPath } from '@cavuno/board/server';

/** The paywall page's own path — the return-to fallback and the loader's redirect target. */
export const RETURN_PATH = '/account/access';

/**
 * A `returnTo` search param is buyer-controlled, so it is never trusted raw:
 * `safeRedirectPath` collapses anything that isn't a same-origin relative path
 * to the fallback, and we drop a path that points back at this page to avoid a
 * post-payment loop. Returns null when there is no safe path to return to.
 */
export function safeReturnTo(value: string | undefined): string | null {
  if (!value) return null;
  const safe = safeRedirectPath(value, RETURN_PATH);
  const pathname = safe.split(/[?#]/, 1)[0];
  return pathname === RETURN_PATH ? null : safe;
}

const RETURN_PATH_MAX_LENGTH = 400;

/**
 * This page's path, still carrying the buyer's captured destination, for every
 * hop that leaves the page and comes back: the loader's sign-in bounce, and
 * Stripe's `return_url`. Without it a redirect-based payment method (3DS/SCA,
 * iDEAL, Klarna) — which navigates away, so the in-page `onComplete` never
 * fires — returns to a bare `/account/access?session_id=…` and the buyer parks
 * here. Stripe's `session_id` is appended by the API, which joins with `&`
 * when the path already carries a query.
 */
export function accessReturnPath(returnTo: string | null): string {
  if (returnTo === null) return RETURN_PATH;
  const nested = `${RETURN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
  // The API copies the return path into Stripe session metadata, which caps
  // a value at 500 characters. A long search URL would fail checkout
  // outright; falling back to the bare page is the pre-existing behaviour.
  return nested.length > RETURN_PATH_MAX_LENGTH ? RETURN_PATH : nested;
}
