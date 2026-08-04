import { afterEach, describe, expect, it } from 'vitest';

import { boardCopy } from './copy';
import { baseLocale, overwriteGetLocale } from './paraglide/runtime';

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('boardCopy is driven by the URL locale, not the board constant', () => {
  afterEach(() => {
    overwriteGetLocale(() => baseLocale);
  });

  it('resolves the runtime locale even when callers pass the board language', () => {
    // Callers thread board.language (a board-level constant); under a
    // /de/ chrome locale the seam must follow the URL, or prefixed routes
    // would render the base language. baseLocale === board.language is a
    // generation-time invariant, so the param is redundant by design.
    overwriteGetLocale(() => 'de');
    expect(boardCopy('en').jobCard.featuredLabel).toBe('Hervorgehoben');
    overwriteGetLocale(() => baseLocale);
    expect(boardCopy('de').jobCard.featuredLabel).toBe('Featured');
  });

  it('keeps parameterized keys callable with their positional signature', () => {
    overwriteGetLocale(() => 'de');
    expect(boardCopy('en').jobDetail.experienceYears(5)).toBe('5+ Jahre');
    expect(boardCopy('en').jobDetail.posted('heute')).toBe(
      'Veröffentlicht heute',
    );
  });

  it('keeps every public UiCopy message in the statically tree-shakeable map', () => {
    const publicGroups = new Set([
      'alerts',
      'apply',
      'blog',
      'breadcrumbs',
      'copyLink',
      'entity',
      'footer',
      'jobCard',
      'jobDetail',
      'jobSearch',
      'nav',
      'pagination',
      'salary',
    ]);
    const catalog = JSON.parse(
      readFileSync(join(import.meta.dirname, '../messages/en.json'), 'utf8'),
    ) as Record<string, string>;
    const expected = Object.keys(catalog)
      .filter((key) => publicGroups.has(key.slice(0, key.indexOf('_'))))
      .sort();
    const copy = boardCopy('en') as unknown as Record<
      string,
      Record<string, unknown>
    >;
    const actual = Object.entries(copy)
      .flatMap(([group, values]) =>
        Object.keys(values).map((key) => `${group}_${key}`),
      )
      .sort();

    expect(actual).toEqual(expected);
  });
});

describe('the copy seam is the only catalog call site', () => {
  const SRC = join(import.meta.dirname);

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return walk(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  it('no file imports the removed SDK uiCopy catalog', () => {
    const offenders = walk(SRC).filter((path) => {
      const source = readFileSync(path, 'utf8');
      return /\buiCopy\b/.test(source) && /@cavuno\/board\/format/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
