const SCRIPT_ID = 'cavuno-adsense-loader';
/** Shared loader; Auto ads formats and placement are configured in AdSense. */
export function ensureAdSenseScript(clientId: string) {
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  document.head.appendChild(script);
}
