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
    const en = JSON.parse(
      readFileSync(join(root, 'messages/en.json'), 'utf8'),
    ) as Record<string, string>;
    const xa = JSON.parse(
      readFileSync(join(root, 'messages/en-XA.json'), 'utf8'),
    ) as Record<string, string>;
    for (const key of Object.keys(en)) {
      if (key.startsWith('$')) continue;
      expect(xa[key], `missing en-XA for ${key}`).toBeDefined();
      expect(xa[key]!.includes('⟦'), `${key} not pseudo-localized`).toBe(true);
      // Stale-derivation guard: regenerating from the current en must
      // reproduce the committed value (npm run gen:messages).
      expect(xa[key]).toBe(pseudoLocalize(en[key]!));
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
    const en = JSON.parse(
      readFileSync(join(root, 'messages/en.json'), 'utf8'),
    ) as Record<string, string>;
    const xb = JSON.parse(
      readFileSync(join(root, 'messages/ar-XB.json'), 'utf8'),
    ) as Record<string, string>;
    for (const key of Object.keys(en)) {
      if (key.startsWith('$')) continue;
      expect(xb[key], `missing ar-XB for ${key}`).toBeDefined();
      expect(xb[key]).toBe(pseudoBidi(en[key]!));
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
