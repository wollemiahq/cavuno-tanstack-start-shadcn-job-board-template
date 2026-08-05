import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Chrome-locale catalogs must carry the SAME key set. A key present in
 * en.json but missing from de/fr compiles as a silent alias to English —
 * the en-XA pseudo-locale gate cannot see it (it is generated from en), so
 * 18 employer keys once shipped English on /de/ and /fr/ with green tests.
 */
const read = (locale: string): Record<string, string> =>
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, '..', 'messages', `${locale}.json`),
      'utf8',
    ),
  );

describe('message catalog parity', () => {
  const en = read('en');
  const keys = Object.keys(en).filter((k) => !k.startsWith('$'));

  for (const locale of ['de', 'fr']) {
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
