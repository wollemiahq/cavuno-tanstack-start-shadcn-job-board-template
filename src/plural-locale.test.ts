import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Polish has four CLDR plural categories (one/few/many/other); English has two.
 * Plural copy used to be two catalog keys picked at the call site with
 * `count === 1 ? One : Other`, which is unrepresentable in Polish: "2 oferty"
 * and "5 ofert" are different words and both differ from "1 oferta".
 *
 * These assert the catalogs themselves, because the failure is silent — a
 * missing arm renders grammatically wrong copy, or the raw message key, rather
 * than raising.
 */
type PluralVariant = {
  declarations: string[];
  selectors: string[];
  /** Selector arm (`countPlural=one`) to its pattern. */
  match: Record<string, string>;
};

/** A message is either a simple pattern or a list of variants. */
type CatalogEntry = string | PluralVariant[];
type MessageCatalog = Record<string, CatalogEntry>;

function readCatalog(locale: string): MessageCatalog {
  const path = join(import.meta.dirname, `../messages/${locale}.json`);
  // SAFETY: the catalogs are committed to this repo and validated by the
  // Paraglide compiler on every build, so their shape is a repo invariant
  // rather than an external payload.
  return JSON.parse(readFileSync(path, 'utf8')) as MessageCatalog;
}

function readVariants(locale: string, key: string): PluralVariant[] {
  const entry = readCatalog(locale)[key];
  if (!Array.isArray(entry)) {
    throw new Error(`${key} in ${locale} is not a complex (variant) message`);
  }
  return entry;
}

/** Category names, stripped of the `countPlural=` selector prefix. */
function categories(variants: PluralVariant[]): string[] {
  return Object.keys(variants[0].match).map((arm) => arm.split('=')[1] ?? arm);
}

const PLURAL_KEYS = [
  'jobSearch_resultsCount',
  'companySearch_resultsCount',
  'employerApplicants_count',
  'accountSaved_count',
  'employerMembers_count',
];

describe('plural messages', () => {
  it('Polish declares few and many, not just one and other', () => {
    for (const key of PLURAL_KEYS) {
      const cats = categories(readVariants('pl', key));
      expect(cats, `${key} in pl`).toContain('one');
      expect(cats, `${key} in pl`).toContain('few');
      expect(cats, `${key} in pl`).toContain('many');
    }
  });

  it('every locale ends with a wildcard arm so no category renders the raw key', () => {
    // The compiler falls back to the message KEY when no arm matches, so a
    // locale missing an arm would print "jobSearch_resultsCount" on the page.
    for (const locale of ['en', 'de', 'fr', 'es', 'pl']) {
      for (const key of PLURAL_KEYS) {
        expect(
          categories(readVariants(locale, key)),
          `${key} in ${locale}`,
        ).toContain('*');
      }
    }
  });

  it('Polish uses genuinely different words per category', () => {
    const { match } = readVariants('pl', 'jobSearch_resultsCount')[0];
    const forms = new Set([
      match['countPlural=one'],
      match['countPlural=few'],
      match['countPlural=many'],
    ]);
    expect(forms.size).toBe(3);
  });

  it('keeps the selection input separate from the display label', () => {
    // Call sites pass a locale-formatted string for display ("1,234"), but CLDR
    // selection needs the raw number. Conflating them breaks selection.
    const { declarations } = readVariants('en', 'jobSearch_resultsCount')[0];
    expect(declarations).toContain('input count');
    expect(declarations).toContain('input countLabel');
  });
});
