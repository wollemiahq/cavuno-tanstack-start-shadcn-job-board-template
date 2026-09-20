import { describe, expect, it } from 'vitest';

import settings from '../project.inlang/settings.json';
import { publicLocales } from './lib/public-locales';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Dormant catalogs are completed when enabled, not on every board edit.
const messagesDir = join(import.meta.dirname, '..', 'messages');

const read = (locale: string): Record<string, string> =>
  JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'));

const extraLocales = publicLocales(settings.locales).filter(
  (locale) => locale !== 'en',
);

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
