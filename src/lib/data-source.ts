/**
 * Dual data-source selection — which publishable key + session cookie a
 * request uses when the AI builder has injected `CAVUNO_DEMO_BOARD`.
 *
 * This module is **pure** (no env, no request, no SDK) so the toolbar can
 * write the preference cookie from the browser. Server helpers that need
 * env / Cookie headers live in `data-source.server.ts`.
 *
 * Cookie `cavuno_data_source` is a UI preference (`board` | `demo`), not a
 * credential: Path=/, SameSite=Lax, not httpOnly. When the demo key is
 * absent, every server helper collapses to `board` regardless of cookie
 * value so pre-dual-source deploys stay byte-identical.
 */

export type DataSource = 'board' | 'demo';

export const DATA_SOURCE_COOKIE = 'cavuno_data_source';

const DATA_SOURCE_CHOICES = ['board', 'demo'] as const;

function dataSourceChoice(value: string): DataSource | null {
  return DATA_SOURCE_CHOICES.find((choice) => choice === value) ?? null;
}

/** Parse the data-source preference from a Cookie header. Null if absent/invalid. */
export function parseDataSourceCookie(
  cookieHeader: string | null | undefined,
): DataSource | null {
  if (!cookieHeader) return null;
  const pair = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DATA_SOURCE_COOKIE}=`));
  if (!pair) return null;
  const value = pair.slice(DATA_SOURCE_COOKIE.length + 1);
  return dataSourceChoice(value);
}

/**
 * Serialize the data-source preference as a Set-Cookie value (or a
 * `document.cookie` write string). Not httpOnly — it is a UI preference.
 */
export function serializeDataSourceCookie(source: DataSource): string {
  return `${DATA_SOURCE_COOKIE}=${source}; Path=/; SameSite=Lax`;
}

/**
 * Pure resolver: cookie value ⊕ whether a demo key exists → effective source.
 * Absent demo key always yields `board`.
 */
export function resolveDataSource(
  cookieHeader: string | null | undefined,
  demoConfigured: boolean,
): DataSource {
  if (!demoConfigured) return 'board';
  return parseDataSourceCookie(cookieHeader) ?? 'board';
}
