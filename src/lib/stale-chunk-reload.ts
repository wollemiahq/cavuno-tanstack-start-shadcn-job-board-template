/**
 * Stale-chunk recovery. A deploy replaces every hashed `/assets/*` chunk;
 * an HTML document from before it (edge-cached, or a tab left open) still
 * asks for the old names, so the first lazy route or component import
 * fails with "Failed to fetch dynamically imported module" / "Importing a
 * module script failed" and the visitor gets the error page (live
 * 2026-09-09: ~200 such crashes a day across four boards, none of them a
 * code fault). Vite reports every such failure as a `vite:preloadError`
 * event before rethrowing; one reload fetches the current document and
 * its current chunks.
 *
 * Loop guard: a reload is allowed once per minute per tab. If the fresh
 * document fails the same way the error propagates normally — it is then
 * a real fault, and the error reporting sees it.
 */

export const STALE_CHUNK_RELOAD_KEY = 'cavuno:stale-chunk-reload';
export const STALE_CHUNK_RELOAD_COOLDOWN_MS = 60_000;

export interface StaleChunkReloadWindow {
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  sessionStorage: Pick<Storage, 'getItem' | 'setItem'>;
  location: Pick<Location, 'reload'>;
}

/**
 * Installs the listener. Inlined into the document as
 * `(${installStaleChunkReload.toString()})(window)` — so it must stay a
 * self-contained function: no imports, no outer references, and no syntax
 * the inline sink cannot carry verbatim (the constants above are repeated
 * inside for that reason).
 */
export function installStaleChunkReload(win: StaleChunkReloadWindow): void {
  win.addEventListener('vite:preloadError', function (event) {
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
    event.preventDefault();
    win.location.reload();
  });
}

/** The inline `<script>` body for the document head. */
export function staleChunkReloadScript(): string {
  return `(${installStaleChunkReload.toString()})(window)`;
}
