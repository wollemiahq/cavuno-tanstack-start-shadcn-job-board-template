/**
 * Server env access — the ONLY sanctioned way to read configuration.
 *
 * Template rule: never read `process.env` at module scope. On Workers
 * it is injected per-request, so module-scope reads evaluate to
 * `undefined` at build/cold-start. The `cloudflare:workers` env binding
 * is safe everywhere (dev via the Cloudflare Vite plugin, deployed
 * Workers), including module scope — but route through this helper so
 * validation fails loud and in one place.
 */
import { env } from 'cloudflare:workers';

export interface ServerEnv {
  /** Board API base, e.g. https://api.cavuno.com (local dev: http://localhost:3000/api). */
  apiUrl: string;
  /** Board identifier — the deployment's pk_… publishable key. */
  board: string;
  /**
   * Optional demo-tenant publishable key (builder-injected). When set, the
   * preview toolbar becomes a dual data-source switcher and persona/session
   * machinery runs against this tenant. Absent ⇒ every dual-source path
   * collapses to the primary board (byte-compatible with pre-dual-source).
   */
  demoBoard?: string;
  /**
   * True when `CAVUNO_DEMO_BOARD_PRIVATE=1` — the demo tenant is a private
   * per-board shadow (reseed + board-settings toggles allowed). Unset ⇒
   * shared public fixture (those mutating affordances stay hidden).
   */
  demoBoardPrivate: boolean;
}

export function getServerEnv(): ServerEnv {
  const raw = env as Record<string, unknown>;
  const apiUrl = raw.CAVUNO_API_URL;
  const board = raw.CAVUNO_BOARD;
  if (typeof apiUrl !== 'string' || apiUrl.length === 0) {
    throw new Error('CAVUNO_API_URL is not set (wrangler vars / .dev.vars)');
  }
  if (typeof board !== 'string' || board.length === 0) {
    throw new Error('CAVUNO_BOARD is not set (wrangler vars / .dev.vars)');
  }

  const demoRaw = raw.CAVUNO_DEMO_BOARD;
  const demoBoard =
    typeof demoRaw === 'string' && demoRaw.length > 0 ? demoRaw : undefined;

  // Only the exact string "1" enables private-shadow affordances.
  const demoBoardPrivate = raw.CAVUNO_DEMO_BOARD_PRIVATE === '1';

  return { apiUrl, board, demoBoard, demoBoardPrivate };
}
