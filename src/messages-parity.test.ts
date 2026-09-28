import { describe, expect, it } from 'vitest';

import { publicLocales } from './lib/public-locales';
import { baseLocale, locales } from './paraglide/runtime';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Variant = {
  declarations: string[];
  match: Record<string, string>;
};
type Entry = string | Variant[];

function read(locale: string): Record<string, Entry> {
  return JSON.parse(
    readFileSync(
      join(import.meta.dirname, '../messages', `${locale}.json`),
      'utf8',
    ),
  );
}

function inputs(entry: Entry): string[] {
  const names = Array.isArray(entry)
    ? entry.flatMap((variant) =>
        variant.declarations.filter((declaration) =>
          declaration.startsWith('input '),
        ),
      )
    : [...entry.matchAll(/\{\{?([\w]+)\}?\}/g)].map(
        (match) => `input ${match[1]}`,
      );
  return [...new Set(names)].sort();
}

// Dormant catalogs and unused keys do not constrain customer customization.
// Enabled translations must accept the inputs used by the base messages.
describe('enabled message catalogs', () => {
  const base = read(baseLocale);
  const keys = Object.keys(base).filter((key) => !key.startsWith('$'));

  it('has messages for the configured base locale', () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  for (const locale of publicLocales(locales).filter(
    (value) => value !== baseLocale,
  )) {
    it(`${locale} supports the base message inputs`, () => {
      const translated = read(locale);
      for (const key of keys) {
        expect(translated, key).toHaveProperty(key);
        expect(inputs(translated[key]), `${locale}: ${key}`).toEqual(
          inputs(base[key]),
        );
      }
    });
  }
});
