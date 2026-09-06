const SCRIPT_ID = 'cavuno-adsense-loader';
/** One script for manual units and regular, non-expanding bottom anchors. */
export function ensureAdSenseScript(clientId: string) {
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.overlays = 'collapsed-bottom';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  document.head.appendChild(script);
}
