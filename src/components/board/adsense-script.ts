import { isWorkingPreviewHostname } from '@/components/analytics-preview';

const SCRIPT_ID = 'cavuno-adsense-loader';
// Same crawler pattern as src/lib/stale-chunk-reload-runtime.js. `bot\b`
// rather than `bot` so phone models such as "CUBOT_X19" are not crawlers.
const CRAWLER_UA =
  /bot\b|bot\/|crawler|spider|slurp|inspectiontool|lighthouse/i;
/**
 * Shared loader; Auto ads formats and placement are configured in AdSense.
 * Returns whether the loader is on the page (injected now or earlier).
 *
 * Crawlers get the page but not the ad tag: a rendering crawler (Baiduspider-
 * render, Googlebot) otherwise loads AdSense like a visitor, and that
 * traffic counts against the publisher's invalid-traffic score.
 */
export function ensureAdSenseScript(clientId: string): boolean {
  if (isWorkingPreviewHostname(window.location.hostname)) return false;
  if (CRAWLER_UA.test(window.navigator.userAgent)) return false;
  if (document.getElementById(SCRIPT_ID)) return true;
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  // Read by the Google CMP bridge, which may subscribe after the error.
  script.onerror = () => script.setAttribute('data-failed', '');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  document.head.appendChild(script);
  return true;
}
