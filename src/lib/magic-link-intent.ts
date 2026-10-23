export const MAGIC_LINK_BROWSER_BINDING_PARAM = 'cavuno_magic_binding';
const COOKIE = '__Host-cavuno-magic-request';
const BROWSER_COOKIE = '__Host-cavuno-magic-browser';

function cookieValue(cookie: string | null | undefined, name: string) {
  return cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function emailHash(email: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(email.trim().toLowerCase()),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function hasMagicLinkIntent(cookie: string | null | undefined) {
  return Boolean(cookieValue(cookie, COOKIE));
}

export async function magicLinkIntentCookie(email: string) {
  return `${COOKIE}=${await emailHash(email)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function clearMagicLinkIntentCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** A requested email binds automatic login to the account the browser chose. */
export async function matchesMagicLinkIntent(
  cookie: string | null | undefined,
  email: string,
) {
  const expected = cookieValue(cookie, COOKIE);
  return Boolean(expected && expected === (await emailHash(email)));
}

/** Bind automatic exchange to this specific request before consuming its token. */
export function magicLinkBrowserCookie(binding: string) {
  return `${BROWSER_COOKIE}=${binding}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${binding ? 600 : 0}`;
}

export function matchesMagicLinkBrowser(
  cookie: string | null | undefined,
  binding: string | undefined,
) {
  return Boolean(binding && cookieValue(cookie, BROWSER_COOKIE) === binding);
}
