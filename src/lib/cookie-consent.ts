/**
 * Cookie-consent preference helpers — pure (no env, no request) so the
 * banner can read and write the cookie from the browser.
 *
 * Cookie `cavuno_cookie_consent` is consent state, not an auth credential:
 * Path=/, SameSite=Lax, max-age ~13 months, not httpOnly so client JS can
 * write it. Hard rule 3 (session credentials) does not apply. Public-document
 * SSR does not read this cookie.
 *
 * Value: `<choice>[.<consentId>][.reopened]`, e.g.
 * `accepted.3f2b…-…` — the choice, the pseudonymous consent id every
 * recorded choice from this browser shares, and a `reopened` marker while
 * "Cookie preferences" has the banner open again (no choice in force; the
 * leading choice is then the last one made, kept so a decline can tell a
 * withdrawal from a first refusal). A bare `accepted` / `denied` (cookies
 * written before consent ids) still parses; it gains an id on the next
 * choice.
 */

export type CookieConsentChoice = 'accepted' | 'denied';

export const COOKIE_CONSENT_COOKIE = 'cavuno_cookie_consent';

/** ~13 months in seconds — long-lived preference, not a session token. */
export const COOKIE_CONSENT_MAX_AGE = 13 * 30 * 24 * 60 * 60;

const COOKIE_CONSENT_CHOICES = ['accepted', 'denied'] as const;

const REOPENED = 'reopened';

const CONSENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function cookieConsentChoice(value: string): CookieConsentChoice | null {
  return COOKIE_CONSENT_CHOICES.find((choice) => choice === value) ?? null;
}

/** Everything the consent cookie holds. */
export interface StoredCookieConsent {
  /** The choice in force; null while reopened (undecided). */
  choice: CookieConsentChoice | null;
  /** The visitor's most recent choice, including while reopened. */
  lastChoice: CookieConsentChoice;
  /** Random UUID shared by every recorded choice; null on old cookies. */
  consentId: string | null;
}

/** Read the consent cookie from a Cookie header. Null if absent/invalid. */
export function readCookieConsent(
  cookieHeader: string | null | undefined,
): StoredCookieConsent | null {
  if (!cookieHeader) return null;
  const pair = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_CONSENT_COOKIE}=`));
  if (!pair) return null;
  const [head = '', ...rest] = decodeURIComponent(
    pair.slice(COOKIE_CONSENT_COOKIE.length + 1),
  ).split('.');
  const lastChoice = cookieConsentChoice(head);
  if (!lastChoice) return null;
  const consentId = rest.find((part) => CONSENT_ID_RE.test(part)) ?? null;
  const reopened = rest.includes(REOPENED);
  return { choice: reopened ? null : lastChoice, lastChoice, consentId };
}

/** The choice in force from a Cookie header. Null if absent/invalid/reopened. */
export function parseCookieConsent(
  cookieHeader: string | null | undefined,
): CookieConsentChoice | null {
  return readCookieConsent(cookieHeader)?.choice ?? null;
}

function serialize(parts: string[]): string {
  return `${COOKIE_CONSENT_COOKIE}=${encodeURIComponent(parts.join('.'))}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE}; SameSite=Lax`;
}

/**
 * Serialize the consent preference as a Set-Cookie / `document.cookie` write
 * string. Not httpOnly — client JS must be able to write it.
 */
export function serializeCookieConsent(
  choice: CookieConsentChoice,
  consentId?: string | null,
): string {
  return serialize(consentId ? [choice, consentId] : [choice]);
}

/**
 * Reopen preferences: no choice in force, but the consent id and the last
 * choice stay so the next answer is recorded under the same id.
 */
export function serializeReopenedCookieConsent(
  lastChoice: CookieConsentChoice,
  consentId: string | null,
): string {
  return serialize(
    consentId ? [lastChoice, consentId, REOPENED] : [lastChoice, REOPENED],
  );
}

/** Clear the consent cookie. */
export function clearCookieConsent(): string {
  return `${COOKIE_CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** The banner text a visitor saw when choosing. */
export interface CookieBannerCopy {
  title: string;
  description: string;
  acceptLabel: string;
  denyLabel: string;
}

/** Which trackers the board runs once a visitor accepts. */
export interface CookieBannerTrackers {
  cavunoAnalytics: boolean;
  ga4: boolean;
  gtm: boolean;
  metaPixel: boolean;
  linkedInInsight: boolean;
  adsense: boolean;
}

/** 32-bit FNV-1a over UTF-16 code units, as 8 hex digits. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Identifies what a consent was given to: the banner copy shown and the
 * trackers an accept switches on. Any change to either yields a new
 * version, so a recorded choice can be matched to the exact text and tag
 * set. Deterministic, `v1-` + 8 hex digits.
 */
export function cookieBannerVersion(
  copy: CookieBannerCopy,
  trackers: CookieBannerTrackers,
): string {
  const tags = Object.entries(trackers)
    .filter(([, on]) => on)
    .map(([tag]) => tag)
    .sort();
  return `v1-${fnv1a(
    JSON.stringify([
      copy.title,
      copy.description,
      copy.acceptLabel,
      copy.denyLabel,
      tags,
    ]),
  )}`;
}
