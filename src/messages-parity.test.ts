import { describe, expect, it } from 'vitest';

import { validateCatalog } from '../scripts/catalog-contract.mjs';
import { publicLocales } from './lib/public-locales';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const messagesDir = join(import.meta.dirname, '..', 'messages');

const read = (
  locale: string,
): Record<
  string,
  | string
  | {
      declarations: string[];
      selectors: string[];
      match: Record<string, string>;
    }[]
> => JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'));

// SAFETY: repository-owned Inlang configuration; Paraglide validates its schema.
const settings = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', 'project.inlang/settings.json'),
    'utf8',
  ),
) as { locales?: string[] };
const activeLocales = publicLocales(settings.locales ?? []);

describe('active message catalog contract', () => {
  const en = read('en');

  it('ships at least the English catalog', () => {
    expect(
      Object.keys(en).filter((key) => !key.startsWith('$')).length,
    ).toBeGreaterThan(0);
  });

  it('checks only configured public locales, including interpolation and plural shape', () => {
    for (const locale of activeLocales) {
      expect(validateCatalog(en, read(locale), locale), locale).toEqual([]);
    }
  });
});
