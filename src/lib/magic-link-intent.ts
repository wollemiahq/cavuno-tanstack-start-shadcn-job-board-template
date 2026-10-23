const COOKIE = '__Host-cavuno-magic-request';

function intentHash(cookie: string | null | undefined) {
  return cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
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
  return Boolean(intentHash(cookie));
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
  const expected = intentHash(cookie);
  return Boolean(expected && expected === (await emailHash(email)));
}
