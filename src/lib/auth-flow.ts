import { canonicalPathname } from './localized-path';

export const AUTH_FLOW_KINDS = [
  'magic-link',
  'oauth-complete',
  'reset-password',
  'confirm-email-change',
] as const;
export type AuthFlowKind = (typeof AUTH_FLOW_KINDS)[number];
export const STORED_AUTH_FLOW_TOKEN = 'stored-auth-flow';

function cookieName(kind: AuthFlowKind) {
  return `__Host-cavuno-flow-${kind}`;
}

export function authFlowToken(
  cookie: string | null | undefined,
  kind: AuthFlowKind,
): string | undefined {
  const prefix = `${cookieName(kind)}=`;
  const value = cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!value) return undefined;
  try {
    return decodeURIComponent(value.slice(prefix.length)) || undefined;
  } catch {
    return undefined;
  }
}

export function clearAuthFlowCookie(kind: AuthFlowKind) {
  return `${cookieName(kind)}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Move emailed credentials out of URLs before any document or tracker loads. */
export function captureAuthFlow(request: Request): Response | null {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return null;
  // Match the router's case-insensitive, decoded static paths, including a
  // trailing slash, before any auth document or analytics can render.
  let paths: string[];
  try {
    const decoded = decodeURI(url.pathname);
    paths = [decoded, decoded.toLowerCase()].map((path) =>
      canonicalPathname(path).toLowerCase().replace(/\/+$/, ''),
    );
  } catch {
    return null;
  }
  const kind = AUTH_FLOW_KINDS.find((value) =>
    paths.includes(`/auth/${value}`),
  );
  if (!kind) return null;
  url.searchParams.delete('token');
  url.hash = '';
  const encodedToken = encodeURIComponent(token);
  const cookie =
    encodedToken.length <= 3500
      ? `${cookieName(kind)}=${encodedToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
      : clearAuthFlowCookie(kind);
  return new Response(null, {
    status: 303,
    headers: {
      location: `${url.pathname}${url.search}`,
      'set-cookie': cookie,
      'cache-control': 'private, no-store',
      'referrer-policy': 'no-referrer',
    },
  });
}
