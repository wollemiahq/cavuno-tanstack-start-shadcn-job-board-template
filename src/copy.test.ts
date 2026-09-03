import { afterEach, describe, expect, it } from 'vitest';

import { boardCopy, type BoardCopy } from './copy';
import { entityCopy } from './copy-groups/entity';
import { navCopy } from './copy-groups/nav';
import { baseLocale, overwriteGetLocale } from './paraglide/runtime';

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('boardCopy is driven by the URL locale, not the board constant', () => {
  afterEach(() => {
    overwriteGetLocale(() => baseLocale);
  });

  it('resolves the runtime locale even when callers pass the board language', () => {
    // Callers thread board.language (a board-level constant); the seam
    // follows getLocale() (the URL locale), not that argument. Extra
    // chrome locales pick this up automatically once compiled.
    expect(boardCopy('de').jobCard.featuredLabel).toBe('Featured');
    expect(boardCopy('fr').jobCard.featuredLabel).toBe('Featured');
  });

  it('keeps parameterized keys callable with their positional signature', () => {
    expect(boardCopy('en').jobDetail.experienceYears(5)).toBe('5+ years');
    expect(boardCopy('en').jobDetail.posted('today')).toBe('Posted today');
  });

  it('keeps string-valued ICU messages as reusable catalog templates', () => {
    expect(boardCopy('en').jobSearch).toMatchObject({
      contextualResultsHeading: '{{count}} {{heading}}',
      gatedCountText: '{{count}} more roles are available with full access.',
      // Was resultsCountOne/Many. The catalog now holds one plural message
      // whose category is chosen per locale, so the adapter exposes one
      // template — the general form — matching the catalog key 1:1.
      resultsCount: '{{count}} jobs',
      resultsShowingRange: 'Showing {{from}}–{{to}} of {{count}} jobs',
      senioritySelectedCount: '{{count}} selected',
    });
    expect(boardCopy('en').footer).toMatchObject({
      copyrightPrefix: '© {{year}} {{board_name}}.',
      defaultDescription: 'Discover the latest roles from {{board_name}}.',
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

  it('overlays chrome.json nav and entity strings onto catalog defaults', () => {
    // Stock src/chrome.json is `{}`, so every key stays the catalog
    // string. Pin those literals — not the Paraglide calls production uses.
    expect(navCopy()).toEqual({
      blog: 'Blog',
      companies: 'Companies',
      home: 'Jobs',
      memberships: 'Memberships',
      post: 'Post a job',
      pricing: 'Pricing',
      talent: 'Talent',
    });
    expect(entityCopy()).toEqual({
      companyPlural: 'companies',
      companySingular: 'company',
      jobPlural: 'jobs',
      jobSingular: 'job',
      candidateSingular: 'candidate',
      candidatePlural: 'candidates',
      candidatePresent: 'Present',
    });
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
      if (statSync(path).isDirectory()) return walk(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
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
