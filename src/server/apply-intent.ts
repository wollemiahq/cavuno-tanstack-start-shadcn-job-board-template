/**
 * The board-local Apply POST seam. This module deliberately accepts only a
 * job slug from the browser: destination, country, and candidate profile all
 * remain Cavuno-owned server-side data.
 */
import {
  isSafeApplicationUrl,
  type ApplyIntent,
  type BoardSdk,
  type PublicJob,
} from '@cavuno/board';

import { isTrustedApplyGatewayUrl } from '@/lib/apply-gateway-url';
import { withApplyGatewayCapability } from '@/lib/board';

export const APPLY_SESSION_COOKIE = '__Host-cavuno_apply_session';

const SESSION_KEY_RE = /^[A-Za-z0-9_-]{20,200}$/;

export const APPLY_LOCATION_UNAVAILABLE = 'APPLY_LOCATION_UNAVAILABLE';

type CountryCheck =
  | { kind: 'unrestricted' }
  | { kind: 'countries'; countryCodes: string[] }
  | { kind: 'denied' }
  | { kind: 'gateway_only' };

type ApplyIntentWithCountryCheck = ApplyIntent & {
  countryCheck?: unknown;
};

type RequestWithCloudflareCountry = Request & {
  readonly cf?: { readonly country?: string };
};

/**
 * A cross-site form could otherwise manufacture an Apply attempt. We accept
 * only browser navigations that name this board as their Origin; referer is a
 * conservative fallback for browsers that omit Origin on a form POST.
 */
export function isSameOriginApplyRequest(request: Request): boolean {
  const expected = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin) return origin === expected;
  const referer = request.headers.get('referer');
  if (!referer) return false;
  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=') || null;
  }
  return null;
}

export function applySessionKey(
  cookieHeader: string | null,
  create = () => crypto.randomUUID().replaceAll('-', ''),
): { sessionKey: string; setCookie: string | null } {
  const existing = cookieValue(cookieHeader, APPLY_SESSION_COOKIE);
  if (existing && SESSION_KEY_RE.test(existing)) {
    return { sessionKey: existing, setCookie: null };
  }

  const sessionKey = create();
  if (!SESSION_KEY_RE.test(sessionKey)) {
    throw new Error('Apply session key generator returned an invalid key');
  }
  return {
    sessionKey,
    // __Host- requires Secure, Path=/, and no Domain. It is intentionally
    // httpOnly: this is a host-owned duplicate key, never a browser profile.
    setCookie: `${APPLY_SESSION_COOKIE}=${sessionKey}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1800`,
  };
}

export async function applyJobSlug(request: Request): Promise<string | null> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return null;
  }
  const keys = [...form.keys()];
  // Keep this route's browser contract intentionally tiny. In particular, do
  // not silently discard a caller-supplied destination/profile/session field.
  if (keys.length !== 1 || keys[0] !== 'jobSlug') return null;
  const jobSlug = form.get('jobSlug');
  // Do not accept a destination, profile country, or browser-provided session
  // field. Cavuno resolves all of those from its stored job and identity data.
  if (typeof jobSlug !== 'string') return null;
  const normalized = jobSlug.trim();
  return normalized.length > 0 && normalized.length <= 200 ? normalized : null;
}

export async function createApplyIntent(
  board: BoardSdk,
  jobSlug: string,
  sessionKey: string,
  headers: Record<string, string>,
): Promise<ApplyIntent> {
  return board.jobs.createApplyIntent(
    jobSlug,
    { sessionKey },
    { headers: withApplyGatewayCapability(headers) },
  );
}

function countryCheckFromIntent(intent: ApplyIntent): CountryCheck | null {
  const value = (intent as ApplyIntentWithCountryCheck).countryCheck;
  if (!value || typeof value !== 'object') return null;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === 'unrestricted' || kind === 'denied' || kind === 'gateway_only') {
    return { kind };
  }
  if (kind !== 'countries') return null;
  const countryCodes = (value as { countryCodes?: unknown }).countryCodes;
  if (
    !Array.isArray(countryCodes) ||
    countryCodes.length === 0 ||
    countryCodes.some(
      (country) => typeof country !== 'string' || !/^[A-Z]{2}$/.test(country),
    )
  ) {
    return null;
  }
  return { kind, countryCodes };
}

/**
 * Cloudflare attaches this value directly to the Worker Request. Never use a
 * browser-supplied country header here: the canonical gateway rechecks the
 * decision independently before releasing the destination.
 */
export function visitorCountryFromRequest(request: Request): string | null {
  const country = (request as RequestWithCloudflareCountry).cf?.country;
  return typeof country === 'string' && /^[A-Z]{2}$/.test(country)
    ? country
    : null;
}

export function applyIntentLocationDenied(
  intent: ApplyIntent,
  request: Request,
): boolean {
  const check = countryCheckFromIntent(intent);
  if (!check) return false;
  if (check.kind === 'denied') return true;
  if (check.kind !== 'countries') return false;
  const visitorCountry = visitorCountryFromRequest(request);
  // Missing edge geography leaves the canonical gateway in charge.
  return (
    visitorCountry !== null && !check.countryCodes.includes(visitorCountry)
  );
}

export function wantsApplyJson(request: Request): boolean {
  return request.headers.get('accept')?.includes('application/json') === true;
}

export function applyJsonRedirect(location: string): Response {
  return Response.json(
    { redirectUrl: location },
    {
      headers: {
        'cache-control': 'no-store',
        'referrer-policy': 'strict-origin',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
  );
}

export function applyLocationDeniedResponse(): Response {
  return Response.json(
    { code: APPLY_LOCATION_UNAVAILABLE },
    {
      status: 403,
      headers: {
        'cache-control': 'no-store',
        'referrer-policy': 'strict-origin',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
  );
}

export function gatewayRedirect(
  intent: ApplyIntent,
  setCookie: string | null,
): Response {
  const expiresAt = Date.parse(intent.expiresAt);
  if (
    intent.object !== 'apply_intent' ||
    !SESSION_KEY_RE.test(intent.id) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw new Error('Invalid Apply intent');
  }

  const gateway = new URL(intent.gatewayUrl);
  // The API owns the opaque token, but the starter still refuses to turn into
  // a generic redirector if an upstream response is ever malformed.
  if (!isTrustedApplyGatewayUrl(gateway, 'a', intent.id)) {
    throw new Error('Invalid Apply gateway URL');
  }

  const headers = new Headers({
    location: gateway.toString(),
    'cache-control': 'no-store',
    'referrer-policy': 'strict-origin',
    'x-robots-tag': 'noindex, nofollow',
  });
  if (setCookie) headers.set('set-cookie', setCookie);
  return new Response(null, { status: 303, headers });
}

export function gatewayLocation(intent: ApplyIntent): string {
  const response = gatewayRedirect(intent, null);
  const location = response.headers.get('location');
  if (!location) throw new Error('Invalid Apply gateway URL');
  return location;
}

/** Append every cookie side-effect; a session rotation and duplicate key can
 * both happen on the same Apply request. */
export function withApplyCookies(
  response: Response,
  cookies: Array<string | null>,
): Response {
  for (const cookie of cookies) {
    if (cookie) response.headers.append('set-cookie', cookie);
  }
  return response;
}

/**
 * The sole ordinary-job degraded path. The URL comes from a fresh trusted
 * Board API job read, never the form. Sponsored jobs and unsafe URLs can never
 * take this branch.
 */
export function ordinaryFallbackRedirect({
  isSponsored,
  applicationUrl,
  applyAction,
}: {
  isSponsored: boolean | null | undefined;
  applicationUrl: string | null;
  applyAction: PublicJob['applyAction'] | null | undefined;
}): Response | null {
  if (!applicationUrl) return null;
  let destination: URL;
  try {
    destination = new URL(applicationUrl);
  } catch {
    return null;
  }
  if (
    isSponsored !== false ||
    applyAction !== 'gateway_external' ||
    !isSafeApplicationUrl(applicationUrl) ||
    destination.protocol !== 'https:'
  ) {
    return null;
  }
  return new Response(null, {
    status: 303,
    headers: {
      location: applicationUrl,
      'cache-control': 'no-store',
      'referrer-policy': 'strict-origin',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
