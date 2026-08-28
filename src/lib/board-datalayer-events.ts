/**
 * Standard Cavuno board conversion events for `window.dataLayer` (GTM).
 * Field names match hosted boards so operator GTM containers port unchanged.
 */

export const CAVUNO_AUTH_PARAM = 'cavuno_auth';
export const CAVUNO_AUTH_METHOD_PARAM = 'cavuno_auth_method';
/** Staged on returnTo during OAuth/magic-link for rollout compatibility only. */
export const CAVUNO_AUTH_INTENT_PARAM = 'cavuno_auth_intent';
/** Staged on returnTo during OAuth so the completion redirect knows the provider. */
export const CAVUNO_OAUTH_PROVIDER_PARAM = 'cavuno_oauth_provider';

export type BoardAuthMethod = 'password' | 'google' | 'linkedin' | 'magic_link';
export type BoardAuthEvent = 'sign_up' | 'login';

export type BoardConversionEvent =
  | 'sign_up'
  | 'login'
  | 'apply_click'
  | 'apply_submit'
  | 'job_alert_subscribe';

export type BoardApplyType = 'external' | 'native';

export interface SignUpDataLayerEvent {
  event: 'sign_up';
  method: BoardAuthMethod;
  board_slug: string;
}

export interface LoginDataLayerEvent {
  event: 'login';
  method: BoardAuthMethod;
  board_slug: string;
}

export interface ApplyClickDataLayerEvent {
  event: 'apply_click';
  job_id: string;
  job_slug: string;
  company_slug: string;
  apply_type: BoardApplyType;
  board_slug: string;
}

export interface ApplySubmitDataLayerEvent {
  event: 'apply_submit';
  job_id: string;
  application_id: string;
  job_slug: string;
  company_slug: string;
  board_slug: string;
}

export interface JobAlertSubscribeDataLayerEvent {
  event: 'job_alert_subscribe';
  board_slug: string;
  source: string;
  job_id?: string;
  job_slug?: string;
}

export type BoardDataLayerEvent =
  | SignUpDataLayerEvent
  | LoginDataLayerEvent
  | ApplyClickDataLayerEvent
  | ApplySubmitDataLayerEvent
  | JobAlertSubscribeDataLayerEvent;

const BOARD_AUTH_METHODS: ReadonlySet<string> = new Set([
  'password',
  'google',
  'linkedin',
  'magic_link',
]);

function isBoardAuthMethod(value: string): value is BoardAuthMethod {
  return BOARD_AUTH_METHODS.has(value);
}

function ensureDataLayer(): unknown[] {
  // SAFETY: GTM attaches an optional dataLayer array to window; we create it
  // when missing and only push typed BoardDataLayerEvent values onto it.
  const layer = window as typeof window & { dataLayer?: unknown[] };
  layer.dataLayer = layer.dataLayer ?? [];
  return layer.dataLayer;
}

/** Push one standard conversion event to `window.dataLayer` (always, even before GTM loads). */
export function pushBoardDataLayerEvent(event: BoardDataLayerEvent): void {
  if (import.meta.env.SSR) return;
  ensureDataLayer().push(event);
}

export function appendAuthConversionQuery(
  href: string,
  event: BoardAuthEvent,
  method: BoardAuthMethod,
): string {
  const url = new URL(href, 'https://example.com');
  url.searchParams.set(CAVUNO_AUTH_PARAM, event);
  url.searchParams.set(CAVUNO_AUTH_METHOD_PARAM, method);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function appendAuthIntentQuery(
  href: string,
  intent: BoardAuthEvent,
): string {
  const url = new URL(href, 'https://example.com');
  url.searchParams.set(CAVUNO_AUTH_INTENT_PARAM, intent);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function appendOAuthProviderHint(
  href: string,
  provider: 'google' | 'linkedin',
): string {
  const url = new URL(href, 'https://example.com');
  url.searchParams.set(CAVUNO_OAUTH_PROVIDER_PARAM, provider);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseAuthConversionSearchParams(
  search: URLSearchParams,
): { event: BoardAuthEvent; method: BoardAuthMethod } | null {
  const event = search.get(CAVUNO_AUTH_PARAM);
  const method = search.get(CAVUNO_AUTH_METHOD_PARAM);
  if (event !== 'sign_up' && event !== 'login') return null;
  if (!method || !isBoardAuthMethod(method)) return null;
  return { event, method };
}

/** Resolve OAuth/magic-link completion into a destination with conversion params. */
export function resolvePostAuthConversionRedirect(
  returnTo: string,
  input: {
    isNewUser: boolean;
    fallbackMethod: BoardAuthMethod;
  },
): string {
  const url = new URL(returnTo, 'https://example.com');
  const provider = url.searchParams.get(CAVUNO_OAUTH_PROVIDER_PARAM);
  url.searchParams.delete(CAVUNO_AUTH_INTENT_PARAM);
  url.searchParams.delete(CAVUNO_OAUTH_PROVIDER_PARAM);
  const event: BoardAuthEvent = input.isNewUser ? 'sign_up' : 'login';
  const method: BoardAuthMethod =
    input.fallbackMethod === 'magic_link'
      ? 'magic_link'
      : provider === 'linkedin'
        ? 'linkedin'
        : provider === 'google'
          ? 'google'
          : input.fallbackMethod;
  const base = `${url.pathname}${url.search}${url.hash}`;
  return appendAuthConversionQuery(base, event, method);
}

export function stripAuthConversionSearchParams(
  search: URLSearchParams,
): string {
  const next = new URLSearchParams(search);
  next.delete(CAVUNO_AUTH_PARAM);
  next.delete(CAVUNO_AUTH_METHOD_PARAM);
  next.delete(CAVUNO_AUTH_INTENT_PARAM);
  next.delete(CAVUNO_OAUTH_PROVIDER_PARAM);
  const serialized = next.toString();
  return serialized ? `?${serialized}` : '';
}
