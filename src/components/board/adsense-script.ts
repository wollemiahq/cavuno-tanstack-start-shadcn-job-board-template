import { isWorkingPreviewHostname } from '@/components/analytics-preview';

const SCRIPT_ID = 'cavuno-adsense-loader';
/**
 * Shared loader; Auto ads formats and placement are configured in AdSense.
 * Returns whether the loader is on the page (injected now or earlier).
 */
export function ensureAdSenseScript(clientId: string): boolean {
  if (isWorkingPreviewHostname(window.location.hostname)) return false;
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
