/**
 * en-XA runtime coverage gate — the curl half of the Phase-1 pair (the
 * static half is src/copy-scan.test.ts).
 *
 * Fetches /en-XA/ routes from a running build and asserts catalog-backed
 * chrome renders PSEUDO-LOCALIZED (⟦…⟧): proves the URL locale flows
 * through the server entry → seam → messages end to end. Hardcoded
 * strings render unbracketed on these pages — visible in any screenshot;
 * their burn-down is ratcheted by the static scan, not failed here.
 *
 *   node scripts/pseudo-locale-gate.mjs http://localhost:4173
 */
import { readFileSync } from 'node:fs';

const base = process.argv[2];
if (!base) {
  console.error('usage: node scripts/pseudo-locale-gate.mjs <base-url>');
  process.exit(2);
}

const xa = JSON.parse(readFileSync('messages/en-XA.json', 'utf8'));

// Catalog keys known to render in SSR chrome on every page (footer nav).
const CHROME_KEYS = ['footer_locationsLabel', 'footer_sitemapLabel'];
const ROUTES = ['/en-XA/', '/en-XA/jobs', '/en-XA/companies', '/en-XA/blog'];
// Sanity floor: bracketed runs beyond the two probed keys.
const MIN_BRACKETS = 3;

let failed = false;
for (const route of ROUTES) {
  const url = new URL(route, base).href;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL ${route} — HTTP ${res.status}`);
    failed = true;
    continue;
  }
  const html = await res.text();
  const brackets = (html.match(/⟦/g) ?? []).length;
  const missing = CHROME_KEYS.filter((key) => !html.includes(xa[key]));
  // en-XA is a CI pseudo-locale — it must never be indexable.
  const noindex = /<meta[^>]+name="robots"[^>]+noindex/.test(html);
  if (missing.length > 0 || brackets < MIN_BRACKETS || !noindex) {
    failed = true;
    console.error(
      `FAIL ${route} — ⟦runs⟧=${brackets}${
        missing.length ? `, missing pseudo for: ${missing.join(', ')}` : ''
      }${noindex ? '' : ', missing robots-noindex meta'}`,
    );
  } else {
    console.log(`ok   ${route} — ⟦runs⟧=${brackets}, noindex`);
  }
}

// SEO invariants for real prefixed chrome locales (ADR-0063 D4/D5):
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
  const sitemapClean = !/\/(de|fr|en-XA)\//.test(sitemap);
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
