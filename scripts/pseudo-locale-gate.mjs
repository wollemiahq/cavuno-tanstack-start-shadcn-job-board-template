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
// never inherit the pseudo-bidi locale's direction.
for (const route of ['/jobs', '/de/jobs', '/fr/jobs']) {
  const html = await (await fetch(new URL(route, base).href)).text();
  const served = htmlDir(html);
  if (served !== 'ltr') {
    failed = true;
    console.error(`FAIL ${route} — dir=${served ?? 'MISSING'} (want ltr)`);
  } else {
    console.log(`ok   ${route} — dir="ltr"`);
  }
}

// SEO invariants for real prefixed chrome locales:
// /de/ pages canonicalize to the UNPREFIXED base (chrome-translated
// duplicates), stay indexable, and never appear in the sitemap.
{
  const de = await (await fetch(new URL('/de/jobs', base).href)).text();
  const canonical = de.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
  const deIndexable = !/<meta[^>]+name="robots"[^>]+noindex/.test(de);
  const canonicalUnprefixed = canonical ? !/\/de\//.test(canonical[1]) : false;
  const sitemap = await (
    await fetch(new URL('/sitemap.xml', base).href)
  ).text();
  const sitemapClean = !/\/(de|fr|en-XA|ar-XB)\//.test(sitemap);
  if (!canonicalUnprefixed || !deIndexable || !sitemapClean) {
    failed = true;
    console.error(
      `FAIL seo-invariants — canonical-to-base=${canonicalUnprefixed} ` +
        `(${canonical?.[1] ?? 'MISSING'}), de-indexable=${deIndexable}, ` +
        `sitemap-unprefixed=${sitemapClean}`,
    );
  } else {
    console.log(`ok   seo-invariants — /de/ canonical→base, sitemap clean`);
  }
}

process.exit(failed ? 1 : 0);
