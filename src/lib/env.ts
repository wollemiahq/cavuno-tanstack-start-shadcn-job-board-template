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
   * Publishable analytics tracker token — when set, enables the
   * client-side analytics script. Optional: unset ⇒ no script tag, no
   * analytics; everything else works.
   */
  trackerToken: string | null;
}

export function getServerEnv(): ServerEnv {
  const raw = env as Record<string, unknown>;
  const apiUrl = raw.CAVUNO_API_URL;
  const board = raw.CAVUNO_BOARD;
  const trackerToken = raw.CAVUNO_TRACKER_TOKEN;
  if (typeof apiUrl !== 'string' || apiUrl.length === 0) {
    throw new Error('CAVUNO_API_URL is not set (wrangler vars / .dev.vars)');
  }
  if (typeof board !== 'string' || board.length === 0) {
    throw new Error('CAVUNO_BOARD is not set (wrangler vars / .dev.vars)');
  }
  return {
    apiUrl,
    board,
    trackerToken:
      typeof trackerToken === 'string' && trackerToken.length > 0
        ? trackerToken
        : null,
  };
}
