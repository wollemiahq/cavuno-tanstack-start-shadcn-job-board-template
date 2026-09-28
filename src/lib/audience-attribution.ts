export interface AudienceAttribution {
  channel?: string;
  source?: string;
  campaign?: string;
  location?: string;
  browser?: string;
  os?: string;
  device?: string;
}

/** Browser-supplied analytics is evidence, never executable or unbounded input. */
export function sanitizeAudienceAttribution(
  value: AudienceAttribution | undefined,
): AudienceAttribution | undefined {
  if (!value) return undefined;
  const result: AudienceAttribution = {};
  for (const key of [
    'channel',
    'source',
    'campaign',
    'location',
    'browser',
    'os',
    'device',
  ] as const) {
    const field = value[key];
    // Cookie JSON and optional browser globals are untrusted I/O boundaries.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    if (typeof field !== 'string' || field.length > 700) continue;
    if (key === 'campaign') {
      try {
        const parts: unknown = JSON.parse(field);
        if (
          !Array.isArray(parts) ||
          parts.length !== 3 ||
          !parts.every(
            // Cookie JSON and optional browser globals are untrusted I/O boundaries.
            // oxlint-disable-next-line anti-slop/no-runtime-typeof
            (part) => typeof part === 'string' && part.length <= 200,
          ) ||
          !parts.some(Boolean)
        )
          continue;
        result.campaign = JSON.stringify(parts);
      } catch {
        /* Invalid campaign stays unknown. */
      }
    } else result[key] = field;
  }
  return Object.keys(result).length ? result : undefined;
}

export const SESSION_MS = 30 * 60 * 1000;
export const audienceCookieName = (slug: string) =>
  `cavuno_audience_${encodeURIComponent(slug)}`;

/** Normalize public acquisition evidence without storing full browsing URLs. */
export function normalizeAudienceAttribution(
  href: string,
  referrer: string,
  userAgent: string,
): AudienceAttribution {
  const url = new URL(href);
  let source = '';
  try {
    const ref = new URL(referrer);
    if (ref.host !== url.host && ['http:', 'https:'].includes(ref.protocol))
      source = ref.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    /* Empty referrer is a measured direct visit. */
  }
  const campaign = (url.searchParams.get('utm_campaign') ?? '').slice(0, 200);
  const utmSource = (url.searchParams.get('utm_source') ?? '').slice(0, 200);
  const medium = (url.searchParams.get('utm_medium') ?? '').slice(0, 200);
  const m = medium.toLowerCase();
  const channel = ['email', 'e-mail', 'newsletter'].includes(m)
    ? 'email'
    : [
          'cpc',
          'ppc',
          'paid',
          'paidsearch',
          'paid-search',
          'ppc-search',
        ].includes(m)
      ? 'paid_search'
      : ['paidsocial', 'paid-social', 'paid_social', 'ppc-social'].includes(m)
        ? 'paid_social'
        : ['social', 'social-network', 'social-media'].includes(m)
          ? 'organic_social'
          : /chatgpt|openai|perplexity|copilot|gemini|claude|you\.com|phind/i.test(
                `${source} ${utmSource}`,
              )
            ? 'ai'
            : /(^|\.)(google|bing|duckduckgo|yahoo|baidu|yandex|ecosia)\./.test(
                  source,
                )
              ? 'organic_search'
              : /linkedin|lnkd\.in|(^|\.)twitter\.|t\.co|(^|\.)x\.com|facebook|fb\.com|instagram|reddit/.test(
                    source,
                  )
                ? 'organic_social'
                : source
                  ? 'referral'
                  : 'direct';
  const ua = userAgent.toLowerCase();
  const os = /iphone|ipad|ipod|cpu iphone|cpu os/.test(ua)
    ? 'ios'
    : /android/.test(ua)
      ? 'android'
      : /windows/.test(ua)
        ? 'windows'
        : /mac os x|macintosh/.test(ua)
          ? 'macos'
          : /cros/.test(ua)
            ? 'chromeos'
            : /linux/.test(ua)
              ? 'linux'
              : undefined;
  // Match analytics_hits (including its Chrome precedence for Chromium browsers).
  const browser = /firefox/.test(ua)
    ? 'firefox'
    : /chrome|crios/.test(ua)
      ? 'chrome'
      : /opera/.test(ua)
        ? 'opera'
        : /msie|trident/.test(ua)
          ? 'ie'
          : /iphone|ipad|safari/.test(ua)
            ? 'safari'
            : undefined;
  const result: AudienceAttribution = { channel, source };
  if (campaign || utmSource || medium)
    result.campaign = JSON.stringify([campaign, utmSource, medium]);
  if (os) result.os = os;
  if (browser) result.browser = browser;
  if (ua)
    result.device = /android/.test(ua)
      ? 'mobile-android'
      : /ipad|iphone|ipod/.test(ua)
        ? 'mobile-ios'
        : 'desktop';
  return result;
}

export function parseAudienceCookie(
  value: string | undefined,
  now = Date.now(),
): AudienceAttribution | undefined {
  if (!value || value.length > 4096) return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt < now ||
      parsed.expiresAt > now + SESSION_MS + 5000
    )
      return undefined;
    const snapshot = parsed.attribution;
    // Cookie JSON and optional browser globals are untrusted I/O boundaries.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    if (!snapshot || typeof snapshot !== 'object') return undefined;
    const result: AudienceAttribution = {};
    for (const key of [
      'channel',
      'source',
      'campaign',
      'location',
      'browser',
      'os',
      'device',
    ] as const) {
      if (snapshot[key] !== undefined) {
        // Cookie JSON and optional browser globals are untrusted I/O boundaries.
        // oxlint-disable-next-line anti-slop/no-runtime-typeof
        if (typeof snapshot[key] !== 'string' || snapshot[key].length > 700)
          return undefined;
        result[key] = snapshot[key];
      }
    }
    return sanitizeAudienceAttribution(result);
  } catch {
    return undefined;
  }
}

export function getBrowserAudienceAttribution(
  boardSlug: string,
): AudienceAttribution | undefined {
  // Cookie JSON and optional browser globals are untrusted I/O boundaries.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof document === 'undefined' || !boardSlug) return undefined;
  return readAudienceCookie(document.cookie, boardSlug);
}

/** Called only by the board analytics boundary after its consent decision. */
export function captureBrowserAudienceAttribution(
  boardSlug: string,
  entry: { href: string; referrer: string },
  location?: string,
) {
  try {
    if (getBrowserAudienceAttribution(boardSlug)) return;
    const attribution = normalizeAudienceAttribution(
      entry.href,
      entry.referrer,
      navigator.userAgent,
    );
    if (
      !attribution.location &&
      location &&
      /^[A-Z]{2}$/.test(location) &&
      !['XX', 'T1'].includes(location)
    )
      attribution.location = location;
    document.cookie = `${audienceCookieName(boardSlug)}=${encodeURIComponent(JSON.stringify({ expiresAt: Date.now() + SESSION_MS, attribution }))}; Path=/; Max-Age=1800; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {
    /* Storage restrictions must not block signup. */
  }
}

/** Read a board-scoped snapshot from an incoming Cookie header. */
export function readAudienceCookie(
  header: string | null | undefined,
  board: string,
  now = Date.now(),
): AudienceAttribution | undefined {
  const name = `${audienceCookieName(board)}=`;
  const value = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name))
    ?.slice(name.length);
  return parseAudienceCookie(value, now);
}

export function clearBrowserAudienceAttribution(board: string) {
  // Cookie JSON and optional browser globals are untrusted I/O boundaries.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof document === 'undefined') return;
  document.cookie = `${audienceCookieName(board)}=; Path=/; Max-Age=0; SameSite=Lax`;
}
