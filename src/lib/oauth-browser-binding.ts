export const OAUTH_BROWSER_BINDING_PARAM = 'cavuno_oauth_binding';
const COOKIE = '__Host-cavuno-oauth-browser';
/** Raw secret whose SHA-256 the API stores on the OAuth one-time token. It
 * lives only in this httpOnly cookie, never in a URL. */
const PROOF_COOKIE = '__Host-cavuno-oauth-proof';

function cookieValue(cookie: string | null | undefined, name: string) {
  return cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function oauthBrowserCookie(binding: string) {
  return `${COOKIE}=${binding}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${binding ? 600 : 0}`;
}

export function matchesOAuthBrowser(
  cookie: string | null | undefined,
  binding: string | undefined,
): boolean {
  if (!binding) return false;
  return cookieValue(cookie, COOKIE) === binding;
}

/** A fresh browser-binding secret and the SHA-256 hex the API is sent. */
export async function createOAuthBrowserProof() {
  const secret = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret),
  );
  return { secret, hash: toHex(new Uint8Array(digest)) };
}

export function oauthProofCookie(secret: string) {
  return `${PROOF_COOKIE}=${secret}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${secret ? 600 : 0}`;
}

export function readOAuthProof(
  cookie: string | null | undefined,
): string | undefined {
  return cookieValue(cookie, PROOF_COOKIE) || undefined;
}
