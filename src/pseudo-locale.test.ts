import { describe, expect, it } from 'vitest';

import {
  PDI,
  RLI,
  pseudoBidi,
  pseudoCatalog,
  pseudoLocalize,
} from '../scripts/pseudo-locale.mjs';
import { localeDirection } from './lib/locale-direction';

import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
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
});

describe('QA catalog generation', () => {
  it('preserves plural selectors and interpolation while translating only copy', () => {
    const catalog = {
      $schema: 'schema.json',
      greeting: 'A {name}',
      count: [
        {
          declarations: ['input count'],
          selectors: ['count'],
          match: { 'count=1': 'A', 'count=*': '{count} A' },
        },
      ],
    };
    expect(pseudoCatalog(catalog, pseudoLocalize)).toEqual({
      $schema: 'schema.json',
      greeting: '⟦Á {name}⟧',
      count: [
        {
          declarations: ['input count'],
          selectors: ['count'],
          match: { 'count=1': '⟦Á⟧', 'count=*': '⟦{count} Á⟧' },
        },
      ],
    });
    expect(catalog.greeting).toBe('A {name}');
    expect(catalog.count[0].match['count=1']).toBe('A');
  });

  it('leaves authored catalogs byte-identical and does not rewrite unchanged QA output', () => {
    const root = mkdtempSync(join(tmpdir(), 'qa-catalog-'));
    try {
      mkdirSync(join(root, 'messages'));
      const en = '{ "$schema": "schema.json", "greeting": "A" }\n';
      const de = '{"$schema":"schema.json","greeting":"Hallo"}\n';
      writeFileSync(join(root, 'messages/en.json'), en);
      writeFileSync(join(root, 'messages/de.json'), de);
      const generate = () =>
        execFileSync(
          process.execPath,
          [join(import.meta.dirname, '../scripts/gen-paraglide-messages.mjs')],
          { cwd: root },
        );
      generate();
      const qaPath = join(root, 'messages/en-XA.json');
      const first = statSync(qaPath).mtimeMs;
      generate();
      expect(readFileSync(join(root, 'messages/en.json'), 'utf8')).toBe(en);
      expect(readFileSync(join(root, 'messages/de.json'), 'utf8')).toBe(de);
      expect(JSON.parse(readFileSync(qaPath, 'utf8')).greeting).toBe('⟦Á⟧');
      expect(
        JSON.parse(readFileSync(join(root, 'messages/ar-XB.json'), 'utf8'))
          .greeting,
      ).toBe('\u2067⟦Á⟧\u2069');
      expect(statSync(qaPath).mtimeMs).toBe(first);
    } finally {
      rmSync(root, { recursive: true, force: true });
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
