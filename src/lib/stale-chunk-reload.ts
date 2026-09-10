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

// Import raw source so server/client transforms cannot change the inline HTML.
// The same source is also executable, keeping the listener and inline copy aligned.
export { default as installStaleChunkReload } from './stale-chunk-reload-runtime.js';
import runtimeSource from './stale-chunk-reload-runtime.js?raw';

/** Stable inline script: do not serialize a transformed function with toString(). */
export function staleChunkReloadScript(): string {
  const functionSource = runtimeSource
    .slice(runtimeSource.indexOf('export default ') + 'export default '.length)
    .trim();
  return `(${functionSource})(window)`;
}
