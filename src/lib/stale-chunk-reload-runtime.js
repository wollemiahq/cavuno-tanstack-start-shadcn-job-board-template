/** @param {import('./stale-chunk-reload').StaleChunkReloadWindow} win */
export default function installStaleChunkReload(win) {
  var crawlerReported = false;
  win.addEventListener('vite:preloadError', function (event) {
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
      // Still say so, once per document, so crawler chunk failures stay
      // visible. Same body as src/lib/client-error-report.ts; beacon only.
      if (crawlerReported) return;
      crawlerReported = true;
      try {
        var error = /** @type {{ payload?: Error }} */ (event).payload;
        var location = win.location;
        win.navigator.sendBeacon(
          '/.well-known/cavuno/client-error',
          new Blob(
            [
              JSON.stringify({
                name: String((error && error.name) || 'Error').slice(0, 200),
                message: String(
                  (error && error.message) || 'vite:preloadError',
                ).slice(0, 500),
                path: String(location.pathname || '/').slice(0, 500),
                host: String(location.host || '').slice(0, 253),
                kind: 'crawler-reload-skipped',
              }),
            ],
            { type: 'application/json' },
          ),
        );
      } catch {
        // Reporting must never touch the page the crawler is rendering.
      }
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
