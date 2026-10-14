/** @param {import('./stale-chunk-reload').StaleChunkReloadWindow} win */
export default function installStaleChunkReload(win) {
  win.addEventListener('vite:preloadError', function () {
    // Crawlers and page testers render one document and snapshot it. A
    // reload there navigates away mid-render, and the snapshot is blank or
    // whatever the next load shows. They keep the server-rendered page
    // instead (src/lib/hydration-chunk-gate.ts).
    var userAgent = (win.navigator && win.navigator.userAgent) || '';
    if (
      /bot\b|bot\/|crawler|spider|slurp|inspectiontool|lighthouse/i.test(
        userAgent,
      )
    ) {
      return;
    }
    var key = 'cavuno:stale-chunk-reload';
    var cooldownMs = 60000;
    var now = Date.now();
    var last = 0;
    try {
      last = Number(win.sessionStorage.getItem(key)) || 0;
    } catch {
      // Storage disabled: still reload once — the guard is a nicety.
    }
    if (now - last < cooldownMs) return;
    try {
      win.sessionStorage.setItem(key, String(now));
    } catch {
      // Same: never let a storage failure block the recovery.
    }
    // Keep the import rejected while navigation is pending. Cancelling this
    // event makes Vite resolve the failed import as undefined; lazy route and
    // React.lazy consumers then crash reading its exports before the reload.
    win.location.reload();
  });
}
