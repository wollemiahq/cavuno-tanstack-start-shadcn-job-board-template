import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardCopy, type BoardCopy } from './copy';
import { entityCopy } from './copy-groups/entity';
import { navCopy } from './copy-groups/nav';
import { chromeEntity, chromeNav } from './lib/site-chrome';
import { m } from './paraglide/messages';

import type { LocalizedString } from './paraglide/runtime';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Exercise adapter wiring with controlled messages and overrides, independent
// of the board owner's wording and chrome configuration.
vi.mock('./lib/site-chrome', () => ({
  chromeNav: vi.fn(() => ({})),
  chromeEntity: vi.fn(() => ({})),
  chromeFooter: vi.fn(() => ({ labels: {} })),
}));

// SAFETY: controlled test messages stand in for the compiler's branded output.
const localized = (value: string) => value as LocalizedString;

describe('localized copy adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(chromeNav).mockReturnValue({});
    vi.mocked(chromeEntity).mockReturnValue({});
  });

  it('uses the message resolver without passing the legacy board language', () => {
    const label = vi
      .spyOn(m, 'jobCard_featuredLabel')
      .mockReturnValue(localized('Localized badge'));
    expect(boardCopy('de').jobCard.featuredLabel).toBe('Localized badge');
    expect(boardCopy('fr').jobCard.featuredLabel).toBe('Localized badge');
    expect(label).toHaveBeenCalledWith();
  });

  it('forwards positional parameters to localized messages', () => {
    const years = vi
      .spyOn(m, 'jobDetail_experienceYears')
      .mockReturnValue(localized('Experience fixture'));
    const posted = vi
      .spyOn(m, 'jobDetail_posted')
      .mockReturnValue(localized('Date fixture'));
    expect(boardCopy('en').jobDetail.experienceYears(5)).toBe(
      'Experience fixture',
    );
    expect(years).toHaveBeenCalledWith({ years: 5 });
    expect(boardCopy('en').jobDetail.posted('today')).toBe('Date fixture');
    expect(posted).toHaveBeenCalledWith({ date: 'today' });
  });

  it('passes reusable placeholders and the general plural selector to catalog messages', () => {
    const results = vi
      .spyOn(m, 'jobSearch_resultsCount')
      .mockReturnValue(localized('Count fixture'));
    const range = vi
      .spyOn(m, 'jobSearch_resultsShowingRange')
      .mockReturnValue(localized('Range fixture'));
    const copyright = vi
      .spyOn(m, 'footer_copyrightPrefix')
      .mockReturnValue(localized('Copyright fixture'));
    const copy = boardCopy('en');
    expect(copy.jobSearch.resultsCount).toBe('Count fixture');
    expect(results).toHaveBeenCalledWith({ count: 0, countLabel: '{{count}}' });
    expect(copy.jobSearch.resultsShowingRange).toBe('Range fixture');
    expect(range).toHaveBeenCalledWith({
      from: '{{from}}',
      to: '{{to}}',
      count: '{{count}}',
    });
    expect(copy.footer.copyrightPrefix).toBe('Copyright fixture');
    expect(copyright).toHaveBeenCalledWith({
      year: '{{year}}',
      board_name: '{{board_name}}',
    });
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
    const catalog: Record<string, string> = JSON.parse(
      readFileSync(join(import.meta.dirname, '../messages/en.json'), 'utf8'),
    );
    // Route-owned meta descriptions share the jobDetail_ prefix but are
    // not SDK UiCopy (dropped from @cavuno/board 4.4.1's public map).
    const appOwnedPublicKeys = new Set([
      'jobDetail_metaDescription',
      'jobDetail_metaDescriptionNoCompany',
      'jobDetail_metaDescriptionRemote',
    ]);
    const expected = Object.keys(catalog)
      .filter((key) => publicGroups.has(key.slice(0, key.indexOf('_'))))
      .filter((key) => !appOwnedPublicKeys.has(key))
      .sort();
    const actual = copyGroupNames
      .map((group) => [group, boardCopy('en')[group]] as const)
      .flatMap(([group, values]) =>
        Object.keys(values).map((key) => `${group}_${key}`),
      )
      .sort();

    expect(actual).toEqual(expected);
  });

  it('uses catalog defaults and lets configured nav/entity labels override them', () => {
    vi.spyOn(m, 'nav_home').mockReturnValue(localized('Catalog navigation'));
    vi.spyOn(m, 'entity_jobSingular').mockReturnValue(
      localized('Catalog entity'),
    );
    expect(navCopy().home).toBe('Catalog navigation');
    expect(entityCopy().jobSingular).toBe('Catalog entity');

    vi.mocked(chromeNav).mockReturnValue({ home: 'Opportunities' });
    vi.mocked(chromeEntity).mockReturnValue({ jobSingular: 'opportunity' });
    expect(navCopy().home).toBe('Opportunities');
    expect(entityCopy().jobSingular).toBe('opportunity');
  });
});

const copyGroupNames = [
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
] as const satisfies ReadonlyArray<keyof BoardCopy>;

describe('the copy seam is the only catalog call site', () => {
  const SRC = join(import.meta.dirname);

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (name === 'paraglide') return [];
      if (statSync(path).isDirectory()) return walk(path);
      return /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)
        ? [path]
        : [];
    });
  }

  it('no file imports uiCopy except src/copy.ts', () => {
    const offenders = walk(SRC).filter((path) => {
      if (path === join(SRC, 'copy.ts')) return false;
      const source = readFileSync(path, 'utf8');
      return /\buiCopy\b/.test(source) && /@cavuno\/board\/format/.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it('runtime files import route-owned copy groups instead of boardCopy', () => {
    const offenders = walk(SRC).filter((path) => {
      if (path.endsWith('.test.ts') || path.endsWith('.test.tsx')) return false;
      if (path === join(SRC, 'copy.ts')) return false;
      const source = readFileSync(path, 'utf8');
      return /import\s*\{[^}]*\bboardCopy\b[^}]*\}\s*from\s*['"][^'"]*copy['"]/.test(
        source,
      );
    });

    expect(offenders).toEqual([]);
  });
});
