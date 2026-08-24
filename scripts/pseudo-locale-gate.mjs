/**
 * Pseudo-locale runtime gate, paired with the static copy scan.
 *
 * Fetches the pseudo-locale routes from a running build and asserts
 * catalog-backed chrome renders PSEUDO-LOCALIZED (⟦…⟧): proves the URL
 * locale flows through the server entry → seam → messages end to end.
 * Hardcoded strings render unbracketed on these pages — visible in any
 * screenshot; the static scan rejects them in source.
 *
 * Two pseudo-locales, both noindex:
 *   /en-XA/ — pseudo-accent, coverage only.
 *   /ar-XB/ — pseudo-bidi, coverage PLUS the RTL contract: the document
 *             must serve dir="rtl". Real locales must serve dir="ltr".
 *             This is what proves a physical→logical utility migration
 *             actually mirrored the layout.
 *
 *   node scripts/pseudo-locale-gate.mjs http://localhost:4173
 */
import { readFileSync } from 'node:fs';

const base = process.argv[2];
if (!base) {
  console.error('usage: node scripts/pseudo-locale-gate.mjs <base-url>');
  process.exit(2);
}

// Catalog keys known to render in SSR chrome on every page (footer nav).
const CHROME_KEYS = ['footer_locationsLabel', 'footer_sitemapLabel'];
const PATHS = ['/', '/jobs', '/companies', '/blog'];
// Sanity floor: bracketed runs beyond the two probed keys.
const MIN_BRACKETS = 3;

const PSEUDO_LOCALES = [
  { locale: 'en-XA', dir: 'ltr' },
  { locale: 'ar-XB', dir: 'rtl' },
];

/** `dir` on the document element — the switch RTL styling hangs off. */
function htmlDir(html) {
  return html.match(/<html[^>]*\sdir="([^"]*)"/)?.[1] ?? null;
}

let failed = false;
for (const { locale, dir } of PSEUDO_LOCALES) {
  const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
  for (const path of PATHS) {
    const route = `/${locale}${path}`;
    const res = await fetch(new URL(route, base).href);
    if (!res.ok) {
      console.error(`FAIL ${route} — HTTP ${res.status}`);
      failed = true;
      continue;
    }
    const html = await res.text();
    const brackets = (html.match(/⟦/g) ?? []).length;
    const missing = CHROME_KEYS.filter((key) => !html.includes(messages[key]));
    // Pseudo-locales must never be indexable.
    const noindex = /<meta[^>]+name="robots"[^>]+noindex/.test(html);
    const served = htmlDir(html);
    const dirOk = served === dir;
    if (missing.length > 0 || brackets < MIN_BRACKETS || !noindex || !dirOk) {
      failed = true;
      console.error(
        `FAIL ${route} — ⟦runs⟧=${brackets}${
          missing.length ? `, missing pseudo for: ${missing.join(', ')}` : ''
        }${noindex ? '' : ', missing robots-noindex meta'}${
          dirOk ? '' : `, dir=${served ?? 'MISSING'} (want ${dir})`
        }`,
      );
    } else {
      console.log(`ok   ${route} — ⟦runs⟧=${brackets}, noindex, dir="${dir}"`);
    }
  }
}

// Direction contract for the real, human-facing locales: every shipped
// chrome locale is LTR today, and the unprefixed board language must
// never inherit the pseudo-bidi locale's direction. Extra prefixes
// (`/de/jobs`) are only asserted when those locales are compiled.
const settings = JSON.parse(
  readFileSync('project.inlang/settings.json', 'utf8'),
);
const compiledPublic = (
  Array.isArray(settings.locales) ? settings.locales : []
).filter(
  (locale) =>
    Object.prototype.toString.call(locale) === '[object String]' &&
    locale !== 'en-XA' &&
    locale !== 'ar-XB',
);
const ltrRoutes = [
  '/jobs',
  ...compiledPublic
    .filter((locale) => locale !== (settings.baseLocale ?? 'en'))
    .map((locale) => `/${locale}/jobs`),
];
for (const route of ltrRoutes) {
  const html = await (await fetch(new URL(route, base).href)).text();
  const served = htmlDir(html);
  if (served !== 'ltr') {
    failed = true;
    console.error(`FAIL ${route} — dir=${served ?? 'MISSING'} (want ltr)`);
  } else {
    console.log(`ok   ${route} — dir="ltr"`);
  }
}

// Sitemap must never list CI pseudo-locales. Extra compiled chrome
// locales (when present) are first-class variants: self-canonical,
// indexable, hreflang. Default English-only skips those prefix checks.
{
  const extra = compiledPublic.filter(
    (locale) => locale !== (settings.baseLocale ?? 'en'),
  );
  const sitemap = await (
    await fetch(new URL('/sitemap.xml', base).href)
  ).text();
  const sitemapClean = !/\/(en-XA|ar-XB)\//.test(sitemap);
  let extrasOk = true;
  for (const locale of extra) {
    const page = await (
      await fetch(new URL(`/${locale}/jobs`, base).href)
    ).text();
    const canonical = page.match(
      /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/,
    );
    const indexable = !/<meta[^>]+name="robots"[^>]+noindex/.test(page);
    const selfCanonical = canonical
      ? new RegExp(`/${locale}/jobs`).test(canonical[1])
      : false;
    const hasAlternates =
      new RegExp(`hreflang="${locale}"`, 'i').test(page) &&
      /hreflang="x-default"/i.test(page);
    if (!selfCanonical || !indexable || !hasAlternates) {
      extrasOk = false;
      console.error(
        `FAIL seo-invariants /${locale}/ — self-canonical=${selfCanonical} ` +
          `(${canonical?.[1] ?? 'MISSING'}), indexable=${indexable}, ` +
          `hreflang=${hasAlternates}`,
      );
    }
  }
  if (!sitemapClean || !extrasOk) {
    failed = true;
    if (!sitemapClean) {
      console.error('FAIL seo-invariants — sitemap lists a pseudo-locale path');
    }
  } else {
    console.log(
      extra.length === 0
        ? 'ok   seo-invariants — sitemap clean (English-only)'
        : 'ok   seo-invariants — extra chrome self-canonical + hreflang, sitemap clean',
    );
  }
}

process.exit(failed ? 1 : 0);
