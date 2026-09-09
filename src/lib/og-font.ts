import { themeMeta } from '../theme/resolved';

/**
 * OG cards render the board's theme font the way they already
 * render its colors. `ogFontFamily` is derived by gen:theme (heading
 * family when set, else body family, ' Variable' suffix stripped) —
 * every catalog font is Google-loadable, so a subset binary can be
 * fetched for Takumi at render time (server-side; same posture as the
 * previous hardcoded Inter).
 */
export const OG_FONT_FAMILY = themeMeta.ogFontFamily ?? 'Inter';

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  fallbacks?: OgFont[];
  language?: string;
}

/** Edge TTL for the Google Fonts CSS + binary fetches (seconds). */
const FONT_EDGE_TTL = 3600;

/**
 * Google serves the TTF/OTF `src:` only to legacy user agents; modern UAs
 * get woff2. Keep the existing subset loader on TTF/OTF for predictable font bytes.
 */
const LEGACY_UA =
  'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1';

type WorkersRequestInit = RequestInit & {
  cf?: { cacheTtl?: number; cacheEverything?: boolean };
};

export type FontFetch = (
  input: string,
  init?: WorkersRequestInit,
) => Promise<Response>;

/**
 * Fetch a subset font binary from Google Fonts for `text`.
 *
 * Deliberately NOT `loadGoogleFont` from workers-og: that helper reads and
 * writes `caches.default`, and a Workers-for-Platforms dispatched Worker
 * REFUSES the default cache (`This Worker is not permitted to access the
 * default cache`), so every OG render for a known slug 500'd on the live
 * tenant. Cloudflare's per-request `cf.cacheTtl` gives the same edge reuse
 * without touching the Cache API.
 */
export async function fetchGoogleFontSubset(
  { family, weight, text }: { family: string; weight?: number; text?: string },
  fetchImpl: FontFetch = fetch,
): Promise<ArrayBuffer> {
  const params = new URLSearchParams();
  params.set('family', weight ? `${family}:wght@${weight}` : family);
  if (text) params.set('text', text);
  else params.set('subset', 'latin');
  const cssUrl = `https://fonts.googleapis.com/css2?${params.toString()}`;

  const cf = { cacheTtl: FONT_EDGE_TTL, cacheEverything: true as const };
  const cssResponse = await fetchImpl(cssUrl, {
    headers: { 'User-Agent': LEGACY_UA },
    cf,
  });
  if (!cssResponse.ok) {
    throw new Error(`Google Fonts CSS ${cssResponse.status} for ${family}`);
  }
  const css = await cssResponse.text();
  const fontUrl = css.match(
    /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
  )?.[1];
  if (!fontUrl) throw new Error(`Could not find font URL for ${family}`);

  const fontResponse = await fetchImpl(fontUrl, { cf });
  if (!fontResponse.ok) {
    throw new Error(`Google Fonts binary ${fontResponse.status} for ${family}`);
  }
  return fontResponse.arrayBuffer();
}

/**
 * Load the theme font subset for `text`; fall back to Inter so an OG
 * card degrades to the wrong font rather than a 500 when the family
 * isn't Google-servable (e.g. an off-catalog self-hosted font). A
 * fully egress-blocked runtime (working-preview sandbox) still fails
 * both fetches — the OG routes turn that into a 503, not a 500.
 */
async function loadPrimaryOgFont(
  text: string,
  fetchImpl: FontFetch = fetch,
): Promise<OgFont> {
  try {
    return {
      name: OG_FONT_FAMILY,
      data: await fetchGoogleFontSubset(
        { family: OG_FONT_FAMILY, weight: 600, text },
        fetchImpl,
      ),
    };
  } catch {
    return {
      name: 'Inter',
      data: await fetchGoogleFontSubset(
        { family: 'Inter', weight: 600, text },
        fetchImpl,
      ),
    };
  }
}

/** Only download script families actually needed by this card. */
export function ogFallbackFamilies(text: string, language = 'en'): string[] {
  const families = new Set<string>();
  const cjk =
    language.startsWith('ja') ||
    /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)
      ? 'Noto Sans JP'
      : /^(zh-(TW|HK|Hant))/i.test(language)
        ? 'Noto Sans TC'
        : 'Noto Sans SC';
  const scripts: Array<[RegExp, string]> = [
    [/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u, cjk],
    [/\p{Script=Hangul}/u, 'Noto Sans KR'],
    [/[\p{Script=Greek}\p{Script=Cyrillic}]/u, 'Noto Sans'],
    [/\p{Script=Arabic}/u, 'Noto Sans Arabic'],
    [/\p{Script=Hebrew}/u, 'Noto Sans Hebrew'],
    [/\p{Script=Devanagari}/u, 'Noto Sans Devanagari'],
    [/\p{Script=Thai}/u, 'Noto Sans Thai'],
    [/\p{Script=Bengali}/u, 'Noto Sans Bengali'],
    [/\p{Script=Tamil}/u, 'Noto Sans Tamil'],
    [/\p{Script=Telugu}/u, 'Noto Sans Telugu'],
    [/\p{Script=Kannada}/u, 'Noto Sans Kannada'],
    [/\p{Script=Malayalam}/u, 'Noto Sans Malayalam'],
    [/\p{Script=Gujarati}/u, 'Noto Sans Gujarati'],
    [/\p{Script=Gurmukhi}/u, 'Noto Sans Gurmukhi'],
    [/\p{Script=Sinhala}/u, 'Noto Sans Sinhala'],
    [/\p{Script=Khmer}/u, 'Noto Sans Khmer'],
    [/\p{Script=Lao}/u, 'Noto Sans Lao'],
    [/\p{Script=Myanmar}/u, 'Noto Sans Myanmar'],
    [/\p{Script=Armenian}/u, 'Noto Sans Armenian'],
    [/\p{Script=Georgian}/u, 'Noto Sans Georgian'],
    [/\p{Script=Ethiopic}/u, 'Noto Sans Ethiopic'],
  ];
  for (const [script, family] of scripts) {
    if (script.test(text)) families.add(family);
  }
  return [...families];
}

/** Theme first, with explicit script coverage instead of a Latin-only fallback. */
export async function loadOgFont(
  text: string,
  fetchImpl: FontFetch = fetch,
  language = 'en',
): Promise<OgFont> {
  const [primary, fallbacks] = await Promise.all([
    loadPrimaryOgFont(text, fetchImpl),
    Promise.all(
      ogFallbackFamilies(text, language).map(async (name) => ({
        name,
        data: await fetchGoogleFontSubset(
          { family: name, weight: 600, text },
          fetchImpl,
        ),
      })),
    ),
  ]);
  return { ...primary, fallbacks, language };
}

export function ogFontStack(font: OgFont): string {
  return [font.name, ...(font.fallbacks ?? []).map(({ name }) => name)].join(
    ', ',
  );
}
