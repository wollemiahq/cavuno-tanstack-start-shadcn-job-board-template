/**
 * Withdrawing analytics consent mid-visit. The trackers this board loads
 * directly (Cavuno Analytics, GTM, GA4, Meta Pixel, LinkedIn Insight) and
 * AdSense have no off switch: once their script runs it keeps beaconing for
 * the life of the document. So withdrawal stops them by clearing their
 * host-only first-party cookies and reloading into a document that never
 * loads them.
 *
 * Only host-only cookies are cleared. This code never writes a `Domain=`
 * cookie (ADR-0085): boards on `*.cavuno.app` share a parent domain that is
 * not on the public suffix list, so a `Domain=cavuno.app` write from one
 * board would delete other boards' and Cavuno's cookies. The starter's
 * direct GA4 config sets `cookie_domain: 'none'`, so its `_ga*` cookies are
 * host-only and cleared here. Cookies a vendor scopes to a parent
 * domain (Meta `_fbp`, AdSense `__gads` on a custom domain, GA loaded by
 * the owner's own GTM container with `cookie_domain: auto`), cookies from
 * tags an owner adds inside their GTM container, and cookies vendors set on
 * their own domains (facebook.com, linkedin.com, doubleclick.net) cannot be
 * cleared from the board, by design.
 */

/** Exact first-party cookie names set by the trackers this board loads. */
const ANALYTICS_COOKIE_NAMES = new Set([
  // Cavuno Analytics tracker.
  'session-id',
  // LinkedIn Insight first-party click id.
  'li_fat_id',
  // AdSense on the publisher's domain (Google's ad-cookie list). Exact
  // names: `__gpi_optout` records an ad opt-out and must survive.
  '__gads',
  '__gpi',
  '__eoi',
]);

/**
 * Anchored patterns, so a fork's own cookies (`_gallery_view`) never match.
 * Per-property variants: GA4's `_ga_<MEASUREMENT_ID>`, `_gac_<ID>`,
 * `_gat_<ID>`, and the conversion linker's `_gcl_au` / `_gcl_aw`.
 */
const ANALYTICS_COOKIE_PATTERNS = [
  // Google Analytics / GTM.
  /^_ga$/,
  /^_ga_.+/,
  /^_gac_.+/,
  /^_gat($|_.+)/,
  /^_gid$/,
  // Google conversion linker.
  /^_gcl_/,
  // Meta Pixel browser and click ids: only a host-only copy (fbevents scopes them to `.<eTLD+1>`).
  /^_fbp$/,
  /^_fbc$/,
];

function isAnalyticsCookie(name: string): boolean {
  return (
    ANALYTICS_COOKIE_NAMES.has(name) ||
    ANALYTICS_COOKIE_PATTERNS.some((pattern) => pattern.test(name))
  );
}

/**
 * Expire every host-only first-party analytics cookie visible to this
 * document (Path=/, where all of these trackers set them). The consent
 * cookie and unrelated cookies are left alone.
 */
export function clearAnalyticsCookies(): void {
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter((name) => name !== '' && isAnalyticsCookie(name));
  for (const name of new Set(names)) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

/**
 * Clear the trackers' cookies and reload into a tracker-free document. The
 * kill switch stops Cavuno Analytics flushing beacons as this page unloads.
 */
export function withdrawAnalytics(): void {
  window.__cavunoAnalyticsOff = true;
  clearAnalyticsCookies();
  window.location.reload();
}
