import { describe, expect, it } from 'vitest';

import settings from '../project.inlang/settings.json';

import { readFileSync } from 'node:fs';

type Variant = {
  declarations: string[];
  selectors: string[];
  match: Record<string, string>;
};
type CatalogEntry = string | Variant[];

function readCatalog(locale: string): Record<string, CatalogEntry> {
  // SAFETY: these are repository-owned catalogs also validated by Paraglide.
  return JSON.parse(
    readFileSync(
      new URL(`../messages/${locale}.json`, import.meta.url),
      'utf8',
    ),
  ) as Record<string, CatalogEntry>;
}

function placeholders(pattern: string): string[] {
  return [...new Set(pattern.match(/\{\{[^{}]+\}\}|\{[^{}]+\}/g) ?? [])].sort();
}

describe.skipIf(!settings.locales.includes('nl'))(
  'Dutch catalog contract',
  () => {
    it('covers the complete English catalog without obsolete keys', () => {
      const english = readCatalog('en');
      const dutch = readCatalog('nl');
      expect(Object.keys(dutch).sort()).toEqual(Object.keys(english).sort());
    });

    it('preserves interpolation inputs and plural selectors in every message', () => {
      const english = readCatalog('en');
      const dutch = readCatalog('nl');
      for (const [key, source] of Object.entries(english)) {
        const translated = dutch[key];
        if (Array.isArray(source)) {
          expect(Array.isArray(translated), key).toBe(true);
          if (!Array.isArray(translated)) continue;
          expect(translated.length, key).toBe(source.length);
          for (const [index, variant] of source.entries()) {
            const target = translated[index];
            expect(target.declarations, key).toEqual(variant.declarations);
            expect(target.selectors, key).toEqual(variant.selectors);
            expect(Object.keys(target.match).sort(), key).toEqual(
              Object.keys(variant.match).sort(),
            );
            for (const [arm, pattern] of Object.entries(variant.match)) {
              expect(placeholders(target.match[arm]), `${key}: ${arm}`).toEqual(
                placeholders(pattern),
              );
              expect(
                target.match[arm].trim().length,
                `${key}: ${arm}`,
              ).toBeGreaterThan(0);
            }
          }
        } else {
          expect(Array.isArray(translated), key).toBe(false);
          if (Array.isArray(translated)) continue;
          expect(placeholders(translated), key).toEqual(placeholders(source));
          expect(translated.trim().length, key).toBeGreaterThan(0);
        }
      }
    });
  },
);
