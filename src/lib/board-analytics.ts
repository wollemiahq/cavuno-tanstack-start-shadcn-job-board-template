/**
 * Board product analytics (pageviews + custom events).
 * Mirrors `@cavuno/board/analytics` until the chassis bumps past the
 * release that exports that subpath; swap the import then delete this file.
 */

export const DEFAULT_COLLECT_URL =
  'https://cavuno.com/api/analytics/collect';
export const DEFAULT_SCRIPT_URL = 'https://cavuno.com/js/metrics.js';
export const WELL_KNOWN_COLLECT_PATH = '/.well-known/cavuno/collect';
export const WELL_KNOWN_SCRIPT_PATH = '/.well-known/cavuno/analytics.js';
export const PENDING_TENANT_ID = 'boards_pending';

type InstallOptions = {
  publishableKey: string;
  collectUrl?: string;
  scriptUrl?: string;
};

type State = { publishableKey: string; collectUrl: string };

let installed: State | null = null;

function post(
  state: State,
  action: string,
  payload?: Record<string, unknown>,
): void {
  void fetch(state.collectUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.publishableKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      publishableKey: state.publishableKey,
      action,
      payload: payload ?? {},
    }),
    keepalive: true,
  }).catch(() => undefined);
}

function injectScript(state: State, scriptUrl: string): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-cavuno-analytics="1"]')) return;

  const el = document.createElement('script');
  el.defer = true;
  el.src = scriptUrl;
  el.setAttribute('data-cavuno-analytics', '1');
  el.setAttribute('data-token', state.publishableKey);
  el.setAttribute('data-host', state.collectUrl);
  el.setAttribute('data-tenant-id', PENDING_TENANT_ID);
  el.setAttribute('data-web-vitals', 'true');
  document.head.appendChild(el);
}

export function install(options: InstallOptions): void {
  const publishableKey = options.publishableKey.trim();
  if (!publishableKey.startsWith('pk_')) {
    throw new Error('analytics.install requires a publishable key (pk_…)');
  }

  // Chassis has no well-known proxy yet; default to Cavuno central collect
  // so self-host works with only CAVUNO_BOARD (Hydrogen / Monorail model).
  const collectUrl = (options.collectUrl ?? DEFAULT_COLLECT_URL).replace(
    /\/+$/,
    '',
  );
  const scriptUrl = options.scriptUrl ?? DEFAULT_SCRIPT_URL;

  installed = { publishableKey, collectUrl };
  injectScript(installed, scriptUrl);
}

export function track(
  action: string,
  payload?: Record<string, unknown>,
): void {
  const trimmed = action.trim();
  if (!trimmed || !installed) return;
  post(installed, trimmed, payload);
}

export const analytics = {
  install,
  track,
  DEFAULT_COLLECT_URL,
  DEFAULT_SCRIPT_URL,
};
