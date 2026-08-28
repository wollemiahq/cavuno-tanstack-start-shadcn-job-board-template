import { describe, expect, it } from 'vitest';

import { readFileSync, readdirSync } from 'node:fs';
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

/** CI-only pseudo-locales, generated from English; not shipped chrome. */
const PSEUDO_LOCALES = new Set(['en-XA', 'ar-XB']);

/**
 * Every real catalog on disk, derived rather than listed. A hand-written list
 * silently excludes any locale added later — `pnpm locale:add ru` seeds a
 * catalog by copying English, so a new >2-form language arrives with only
 * `one` and `*` arms and nothing would have checked it.
 */
const LOCALES = readdirSync(join(import.meta.dirname, '../messages'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length))
  .filter((locale) => !PSEUDO_LOCALES.has(locale))
  .sort();

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

/**
 * Every complex (variant) message in the catalog, derived rather than listed —
 * a hand-written subset only guards the messages someone remembered, and the
 * arm that goes missing later will be one of the others.
 */
const PLURAL_KEYS = [
  ...new Set(
    LOCALES.flatMap((locale) =>
      Object.entries(readCatalog(locale))
        .filter(([, value]) => Array.isArray(value))
        .map(([key]) => key),
    ),
  ),
].sort();

describe('plural messages', () => {
  it('actually found the plural messages and the catalogs', () => {
    // Every other test here is a `for (const … of …)` loop, so an empty list
    // would pass all of them green. These floors are what stop the gate going
    // vacuous if a message is flattened back to a plain string.
    expect(PLURAL_KEYS.length).toBeGreaterThanOrEqual(17);
    expect(LOCALES).toContain('en');
    expect(LOCALES).toContain('pl');
  });

  it('every locale declares an arm for each category real counts produce', () => {
    // The invariant a hand-written "Polish needs few/many" check misses:
    // `pnpm locale:add ru` seeds a catalog by copying English, so a new
    // >2-form language arrives with only `one` and `*`. That renders SOMETHING
    // (the wildcard), which is why the wildcard test does not catch it — but it
    // is the wrong word for 2 and 5.
    //
    // Scoped to counts a board actually renders. Modern CLDR also gives es/fr
    // a `many` category, but only for large compact numbers ("1 millón"),
    // where falling through to `*` is correct — requiring it would be noise.
    const REAL_COUNTS = [0, 1, 2, 3, 4, 5, 11, 21, 100, 1000];
    for (const locale of LOCALES) {
      const rules = new Intl.PluralRules(locale);
      const required = [
        ...new Set(REAL_COUNTS.map((n) => rules.select(n))),
      ].filter((category) => category !== 'other');
      for (const key of PLURAL_KEYS) {
        const declared = categories(readVariants(locale, key));
        for (const category of required) {
          expect(declared, `${key} in ${locale}`).toContain(category);
        }
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
