/**
 * The download page's email confirmation, kept in ONE host-owned httpOnly
 * cookie. The Board API answers a shared download link with
 * `purchase_email_confirmation_required` unless the request proves the
 * buyer already confirmed (or first opened) it. This frontend calls the API
 * from its server, so the API's own cookie never reaches it: the API returns
 * the proof as `confirmationToken`, and the starter keeps it here and sends it
 * back in `X-Cavuno-Purchase-Confirmation`.
 *
 * One cookie holds the most recent purchases, keyed by a short SHA-256
 * fingerprint of the purchase token (the token itself is the buyer's
 * credential, so it is never written into a cookie name or value). The list
 * is bounded so a visitor with many purchases cannot grow the Cookie header
 * without limit; the oldest entry is dropped first.
 */

export const PURCHASE_CONFIRMATION_COOKIE =
  '__Host-cavuno_purchase_confirmations';

/** Entries kept; at ~120 bytes each the cookie stays well under 4 KB. */
export const PURCHASE_CONFIRMATION_LIMIT = 12;

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const FINGERPRINT = /^[0-9a-f]{16}$/;
const TOKEN = /^[A-Za-z0-9._~-]{1,512}$/;

type Entry = { fingerprint: string; token: string };

/** First 16 hex chars of the SHA-256 of the purchase token. */
export async function purchaseFingerprint(
  purchaseToken: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(purchaseToken),
  );
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function readRaw(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const prefix = `${PURCHASE_CONFIRMATION_COOKIE}=`;
  const pair = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!pair) return null;
  try {
    return decodeURIComponent(pair.slice(prefix.length));
  } catch {
    return null;
  }
}

/** Parse the cookie; a malformed or tampered value reads as empty. */
export function parsePurchaseConfirmations(
  cookieHeader: string | null,
): Entry[] {
  const raw = readRaw(cookieHeader);
  if (!raw) return [];
  const entries: Entry[] = [];
  for (const part of raw.split(',')) {
    const [fingerprint, token] = part.split(':');
    if (
      fingerprint &&
      token &&
      FINGERPRINT.test(fingerprint) &&
      TOKEN.test(token)
    ) {
      entries.push({ fingerprint, token });
    }
  }
  return entries.slice(-PURCHASE_CONFIRMATION_LIMIT);
}

export function findPurchaseConfirmation(
  cookieHeader: string | null,
  fingerprint: string,
): string | null {
  return (
    parsePurchaseConfirmations(cookieHeader).find(
      (entry) => entry.fingerprint === fingerprint,
    )?.token ?? null
  );
}

/**
 * The `Set-Cookie` value after storing one confirmation. Returns null when
 * the token is not a plain URL-safe string (never written verbatim).
 */
export function serializePurchaseConfirmation(
  cookieHeader: string | null,
  fingerprint: string,
  confirmationToken: string,
): string | null {
  if (!FINGERPRINT.test(fingerprint) || !TOKEN.test(confirmationToken)) {
    return null;
  }
  const kept = parsePurchaseConfirmations(cookieHeader).filter(
    (entry) => entry.fingerprint !== fingerprint,
  );
  const next = [...kept, { fingerprint, token: confirmationToken }].slice(
    -PURCHASE_CONFIRMATION_LIMIT,
  );
  const value = next
    .map((entry) => `${entry.fingerprint}:${entry.token}`)
    .join(',');
  return `${PURCHASE_CONFIRMATION_COOKIE}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE_SECONDS}; ${ATTRIBUTES}`;
}
