/**
 * Withdrawing analytics consent mid-visit. None of the loaded trackers
 * (Cavuno Analytics, GTM, GA4, Meta Pixel, LinkedIn Insight) nor AdSense
 * has an off switch: once their script runs it keeps beaconing for the life of the
 * document. So withdrawal clears the first-party cookies they set and
 * reloads into a document that never loads them.
 *
 * Only first-party cookies can be cleared here. Cookies those vendors set on
 * their own domains (facebook.com, linkedin.com, doubleclick.net) are out
 * of reach of page JavaScript.
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
 * Name prefixes, so per-property variants match too (GA4's
 * `_ga_<MEASUREMENT_ID>`, `_gat_<ID>`, `_gcl_au`, `_gac_<ID>`).
 */
const ANALYTICS_COOKIE_PREFIXES = [
  // Google Analytics / GTM: _ga, _ga_<ID>, _gac_<ID>, _gat, _gat_<ID>.
  '_ga',
  '_gid',
  // Google conversion linker: _gcl_au, _gcl_aw, _gcl_dc.
  '_gcl_',
  // Meta Pixel browser and click ids.
  '_fbp',
  '_fbc',
];

function isAnalyticsCookie(name: string): boolean {
  return (
    ANALYTICS_COOKIE_NAMES.has(name) ||
    ANALYTICS_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}

/**
 * Domains a tracker may have scoped a cookie to: the host itself and each
 * parent domain, stopping before the bare TLD. Without the public suffix
 * list some candidates are public suffixes (`co.uk`); the browser ignores
 * a write to one, so trying them is harmless.
 */
function cookieDomains(hostname: string): string[] {
  // IP addresses and single-label hosts (localhost) only take host-only cookies.
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) return [];
  const labels = hostname.split('.');
  const domains: string[] = [];
  for (let i = 0; i < labels.length - 1; i += 1) {
    domains.push(labels.slice(i).join('.'));
  }
  return domains;
}

/**
 * Expire every first-party analytics cookie visible to this document.
 * A cookie is only removed by a write with its own domain and path, so each
 * name is expired host-only and on every candidate parent domain (Path=/,
 * which is where all of these trackers set them). The consent cookie and
 * unrelated cookies are left alone.
 */
export function clearAnalyticsCookies(
  hostname: string = window.location.hostname,
): void {
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter((name) => name !== '' && isAnalyticsCookie(name));
  const domains = cookieDomains(hostname);
  for (const name of new Set(names)) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Domain=${domain}; Max-Age=0`;
    }
  }
}

/** Clear the trackers' cookies and reload into a tracker-free document. */
export function withdrawAnalytics(): void {
  clearAnalyticsCookies();
  window.location.reload();
}
