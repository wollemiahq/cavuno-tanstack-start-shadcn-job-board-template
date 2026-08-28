import { describe, expect, it } from 'vitest';

import {
  PDI,
  RLI,
  pseudoBidi,
  pseudoLocalize,
} from '../scripts/pseudo-locale.mjs';
import { localeDirection } from './lib/locale-direction';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type PluralVariant = { match?: Record<string, string> };
type CatalogEntry = string | PluralVariant[];

/**
 * Flatten a catalog to the user-visible patterns keyed by message.
 *
 * A simple message is one string. A COMPLEX message (pluralization) is an
 * array of variants whose `match` maps a selector arm to its pattern; each arm
 * is separately user-visible, so each is checked under `<key>#<arm>`. The
 * declarations and selector names are machinery, not copy, and are skipped.
 */
function readStringCatalog(path: string): Map<string, string> {
  // SAFETY: the catalogs are committed to this repo and validated by the
  // Paraglide compiler on every build, so their shape is a repo invariant
  // rather than an external payload.
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<
    string,
    CatalogEntry
  >;
  const catalog = new Map<string, string>();
  for (const [key, value] of Object.entries(parsed)) {
    if (Array.isArray(value)) {
      for (const variant of value) {
        for (const [arm, pattern] of Object.entries(variant.match ?? {})) {
          catalog.set(`${key}#${arm}`, pattern);
        }
      }
      continue;
    }
    catalog.set(key, value);
  }
  return catalog;
}

/**
 * en-XA pseudo-locale. Derived mechanically from
 * the en messages: letters get accented, the whole string is wrapped in
 * ⟦…⟧. A screenshot or curl of /en-XA/ makes un-tokenized copy instantly
 * visible — anything NOT bracketed did not come through Paraglide.
 */
describe('pseudoLocalize', () => {
  it('accents letters and wraps the string in ⟦…⟧', () => {
    const out = pseudoLocalize('Load more');
    expect(out.startsWith('⟦')).toBe(true);
    expect(out.endsWith('⟧')).toBe(true);
    expect(out).not.toContain('Load more'); // letters transformed
    expect(out.length).toBeGreaterThan('Load more'.length);
  });

  it('preserves ICU {param} and board {{token}} placeholders verbatim', () => {
    expect(pseudoLocalize('{years}+ years')).toContain('{years}');
    expect(pseudoLocalize('{years}+ years')).not.toContain('years}+ y');
    const tokens = pseudoLocalize('© {{year}} {{board_name}}. All rights.');
    expect(tokens).toContain('{{year}}');
    expect(tokens).toContain('{{board_name}}');
  });

  it('the committed messages/en-XA.json covers every en key, bracketed', () => {
    const root = join(import.meta.dirname, '..');
    const en = readStringCatalog(join(root, 'messages/en.json'));
    const xa = readStringCatalog(join(root, 'messages/en-XA.json'));
    for (const [key, english] of en) {
      if (key.startsWith('$')) continue;
      const pseudo = xa.get(key);
      expect(pseudo, `missing en-XA for ${key}`).toBeDefined();
      expect(pseudo?.includes('⟦'), `${key} not pseudo-localized`).toBe(true);
      // Stale-derivation guard: regenerating from the current en must
      // reproduce the committed value (npm run gen:messages).
      expect(pseudo).toBe(pseudoLocalize(english));
    }
  });
});

/**
 * ar-XB pseudo-bidi — the RTL sibling of en-XA. Same coverage property
 * (⟦…⟧ brackets), plus an RTL isolate so the string is genuinely
 * bidi-marked, and it is the locale the mirrored-layout gate runs
 * against (`dir="rtl"` under /ar-XB/).
 */
describe('pseudoBidi', () => {
  it('wraps the accented text in an RTL isolate', () => {
    const out = pseudoBidi('Load more');
    expect(out.startsWith(RLI)).toBe(true);
    expect(out.endsWith(PDI)).toBe(true);
    // The en-XA text is still in there verbatim — the runtime gate
    // substring-matches it.
    expect(out).toContain(pseudoLocalize('Load more'));
  });

  it('preserves ICU {param} and board {{token}} placeholders verbatim', () => {
    expect(pseudoBidi('{years}+ years')).toContain('{years}');
    const tokens = pseudoBidi('© {{year}} {{board_name}}.');
    expect(tokens).toContain('{{year}}');
    expect(tokens).toContain('{{board_name}}');
  });

  it('the committed messages/ar-XB.json covers every en key', () => {
    const root = join(import.meta.dirname, '..');
    const en = readStringCatalog(join(root, 'messages/en.json'));
    const xb = readStringCatalog(join(root, 'messages/ar-XB.json'));
    for (const [key, english] of en) {
      if (key.startsWith('$')) continue;
      expect(xb.get(key), `missing ar-XB for ${key}`).toBeDefined();
      expect(xb.get(key)).toBe(pseudoBidi(english));
    }
  });
});

/**
 * `<html dir>` is the switch every RTL affordance resolves against —
 * logical properties, Tailwind `rtl:` variants, Base UI popup placement.
 * The pseudo-bidi locale is the only RTL locale the board ships.
 */
describe('localeDirection', () => {
  it('maps the shipped chrome locales to ltr', () => {
    for (const locale of ['en', 'de', 'fr', 'en-XA']) {
      // de/fr stay LTR so enabling them later does not surprise layout.
      expect(localeDirection(locale), locale).toBe('ltr');
    }
  });

  it('maps the ar-XB pseudo-bidi locale (and real Arabic) to rtl', () => {
    for (const locale of ['ar-XB', 'ar', 'ar-EG', 'he', 'fa-IR']) {
      expect(localeDirection(locale), locale).toBe('rtl');
    }
  });

  it('defaults to ltr for unknown or missing locales', () => {
    expect(localeDirection(undefined)).toBe('ltr');
    expect(localeDirection('')).toBe('ltr');
    expect(localeDirection('zz')).toBe('ltr');
  });
});
