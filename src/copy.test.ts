import { afterEach, describe, expect, it } from 'vitest';

import { boardCopy } from './copy';
import { alertsCopy } from './copy-groups/alerts';
import { applyCopy } from './copy-groups/apply';
import { blogCopy } from './copy-groups/blog';
import { breadcrumbsCopy } from './copy-groups/breadcrumbs';
import { copyLinkCopy } from './copy-groups/copy-link';
import { entityCopy } from './copy-groups/entity';
import { footerCopy } from './copy-groups/footer';
import { jobCardCopy } from './copy-groups/job-card';
import { jobDetailCopy } from './copy-groups/job-detail';
import { jobSearchCopy } from './copy-groups/job-search';
import { navCopy } from './copy-groups/nav';
import { paginationCopy } from './copy-groups/pagination';
import { salaryCopy } from './copy-groups/salary';
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

  it('keeps the route-owned message families equivalent to the canonical adapter', () => {
    const canonical = boardCopy('en') as unknown as Record<
      string,
      Record<string, unknown>
    >;
    const modular = {
      alerts: alertsCopy(),
      apply: applyCopy(),
      blog: blogCopy(),
      breadcrumbs: breadcrumbsCopy(),
      copyLink: copyLinkCopy(),
      entity: entityCopy(),
      footer: footerCopy(),
      jobCard: jobCardCopy(),
      jobDetail: jobDetailCopy(),
      jobSearch: jobSearchCopy(),
      nav: navCopy(),
      pagination: paginationCopy(),
      salary: salaryCopy(),
    } as unknown as Record<string, Record<string, unknown>>;

    for (const [group, values] of Object.entries(canonical)) {
      expect(Object.keys(modular[group] ?? {}).sort()).toEqual(
        Object.keys(values).sort(),
      );
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === 'function') {
          expect(modular[group]?.[key]).toBeTypeOf('function');
        } else {
          expect(modular[group]?.[key]).toBe(value);
        }
      }
    }

    expect(jobDetailCopy().experienceYears(5)).toBe(
      boardCopy('en').jobDetail.experienceYears(5),
    );
    expect(jobDetailCopy().posted('today')).toBe(
      boardCopy('en').jobDetail.posted('today'),
    );
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
