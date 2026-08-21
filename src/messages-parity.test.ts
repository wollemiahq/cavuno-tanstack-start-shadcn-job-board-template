import { describe, expect, it } from 'vitest';

import { PSEUDO_LOCALES } from './lib/public-locales';

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every on-disk chrome catalog (including dormant de/fr that are not in
 * project.inlang/settings.json) must carry the SAME key set as English.
 * A key present in en.json but missing from de/fr compiles as a silent
 * alias to English once that locale is enabled — the en-XA pseudo-locale
 * gate cannot see it (it is generated from en), so 18 employer keys once
 * shipped English on /de/ and /fr/ with green tests.
 */
const messagesDir = join(import.meta.dirname, '..', 'messages');
const pseudo = new Set<string>(PSEUDO_LOCALES);

const read = (locale: string): Record<string, string> =>
  JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'));

const extraLocales = readdirSync(messagesDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length))
  .filter((locale) => locale !== 'en' && !pseudo.has(locale))
  .sort();

describe('message catalog parity', () => {
  const en = read('en');
  const keys = Object.keys(en).filter((k) => !k.startsWith('$'));

  it('ships at least the English catalog', () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  for (const locale of extraLocales) {
    it(`${locale}.json carries every en key (and nothing extra)`, () => {
      const other = read(locale);
      const missing = keys.filter((k) => !(k in other));
      const extra = Object.keys(other).filter(
        (k) => !k.startsWith('$') && !(k in en),
      );
      expect(missing).toEqual([]);
      expect(extra).toEqual([]);
    });
  }
});
