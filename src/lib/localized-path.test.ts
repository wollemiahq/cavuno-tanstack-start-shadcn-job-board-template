import { describe, expect, it } from 'vitest';

import { baseLocale } from '../paraglide/runtime';
import {
  canonicalPathname,
  delocalizeSegments,
  isMachinePath,
  localizePath,
  localizeSegments,
  MACHINE_TEMPLATES,
  SEGMENT_TRANSLATIONS,
  stripLocalePrefix,
} from './localized-path';
import { ROUTE_TEMPLATES } from './route-templates';

import type { LocaleRouting } from './localized-path';

/** A Dutch board with French and German variants. */
const DUTCH_BOARD: LocaleRouting = {
  baseLocale: 'nl',
  isLocale: (tag) => ['nl', 'fr', 'de'].includes(tag),
};

/** An English board with French and German variants. */
const ENGLISH_BOARD: LocaleRouting = {
  baseLocale: 'en',
  isLocale: (tag) => ['en', 'fr', 'de'].includes(tag),
};

/** localizePath reads the compiled runtime: the board language is
 * unprefixed, every other locale keeps its prefix. */
function expectedFor(locale: string, prefixed: string): string {
  if (locale !== baseLocale) return prefixed;
  return prefixed.slice(locale.length + 1) || '/';
}

describe('localized URL segments', () => {
  it('translates every static segment of a base-language path', () => {
    const pairs = [
      ['/jobs', '/vacatures'],
      ['/jobs/locations/amsterdam', '/vacatures/locaties/amsterdam'],
      [
        '/jobs/locations/amsterdam/skills/react',
        '/vacatures/locaties/amsterdam/vaardigheden/react',
      ],
      ['/companies/acme', '/bedrijven/acme'],
      ['/companies/acme/jobs/designer', '/bedrijven/acme/vacatures/designer'],
      [
        '/salaries/titles/nurse/locations',
        '/salarissen/functies/nurse/locaties',
      ],
      [
        '/auth/sign-in?returnTo=%2Fjobs#form',
        '/auth/inloggen?returnTo=%2Fjobs#form',
      ],
      ['/', '/'],
    ] as const;
    for (const [canonical, dutch] of pairs) {
      expect(localizeSegments(canonical, DUTCH_BOARD)).toBe(dutch);
      expect(delocalizeSegments(dutch, DUTCH_BOARD)).toBe(canonical);
    }
  });

  it('translates prefixed variants with their own words', () => {
    for (const routing of [DUTCH_BOARD, ENGLISH_BOARD]) {
      expect(localizeSegments('/fr/jobs?q=react', routing)).toBe(
        '/fr/emplois?q=react',
      );
      expect(localizeSegments('/fr/companies/acme/jobs/x', routing)).toBe(
        '/fr/entreprises/acme/emplois/x',
      );
      expect(delocalizeSegments('/fr/salaires/entreprises', routing)).toBe(
        '/fr/salaries/companies',
      );
      // German keeps the "jobs" anglicism; words it does not list stay.
      expect(localizeSegments('/de/jobs/locations/berlin', routing)).toBe(
        '/de/jobs/locations/berlin',
      );
    }
  });

  it('never translates a param segment', () => {
    // A company literally slugged "jobs", a keyword "companies".
    expect(localizeSegments('/companies/jobs', DUTCH_BOARD)).toBe(
      '/bedrijven/jobs',
    );
    expect(localizeSegments('/jobs/companies', DUTCH_BOARD)).toBe(
      '/vacatures/companies',
    );
    expect(delocalizeSegments('/bedrijven/vacatures', DUTCH_BOARD)).toBe(
      '/companies/vacatures',
    );
    expect(localizeSegments('/fr/companies/jobs/jobs/jobs', DUTCH_BOARD)).toBe(
      '/fr/entreprises/jobs/emplois/jobs',
    );
  });

  it('accepts canonical words on input, so old links still route', () => {
    expect(delocalizeSegments('/jobs/locaties/amsterdam', DUTCH_BOARD)).toBe(
      '/jobs/locations/amsterdam',
    );
    expect(localizeSegments('/vacatures/locations', DUTCH_BOARD)).toBe(
      '/vacatures/locaties',
    );
    expect(canonicalPathname('/fr/emplois?q=x', DUTCH_BOARD)).toBe('/jobs');
    expect(canonicalPathname('/werkgevers/dashboard', DUTCH_BOARD)).toBe(
      '/employers/dashboard',
    );
  });

  it('leaves languages without a word list and English boards unchanged', () => {
    const swedishBoard: LocaleRouting = {
      baseLocale: 'sv',
      isLocale: (tag) => tag === 'sv' || tag === 'en',
    };
    expect(localizeSegments('/jobs/locations/x', swedishBoard)).toBe(
      '/jobs/locations/x',
    );
    expect(localizeSegments('/jobs/locations/x', ENGLISH_BOARD)).toBe(
      '/jobs/locations/x',
    );
  });

  it('never translates machine paths', () => {
    const machinePaths = [
      '/api/jobs',
      '/_serverFn/abc',
      '/go/apply/x',
      '/.well-known/cavuno.json',
      '/sitemap.xml',
      '/sitemap/jobs-details-1.xml',
      '/robots.txt',
      '/ads.txt',
      '/indexnow-key.txt',
      '/p/jane',
      '/embed/jobs',
      '/apply',
      '/jobs/rss.xml',
      '/blog/rss.xml',
      '/blog/og/my-post.json',
      '/blog/my-post/og',
      '/companies/acme/jobs/designer/og',
    ];
    for (const path of machinePaths) {
      expect(isMachinePath(path, DUTCH_BOARD)).toBe(true);
      expect(localizeSegments(path, DUTCH_BOARD)).toBe(path);
      expect(localizeSegments(`/fr${path}`, DUTCH_BOARD)).toBe(`/fr${path}`);
    }
    expect(isMachinePath('/jobs', DUTCH_BOARD)).toBe(false);
    // A job slugged "og" is a page, not an image.
    expect(isMachinePath('/companies/acme/jobs/og', DUTCH_BOARD)).toBe(false);
  });

  it('strips only compiled locale prefixes', () => {
    expect(stripLocalePrefix('/fr/employers/dashboard', DUTCH_BOARD)).toBe(
      '/employers/dashboard',
    );
    expect(stripLocalePrefix('/fr', DUTCH_BOARD)).toBe('/');
    // A word-list key that is not compiled is a path, not a prefix.
    expect(stripLocalePrefix('/nl/jobs', ENGLISH_BOARD)).toBe('/nl/jobs');
  });
});

describe('localizePath (compiled runtime)', () => {
  it('prefixes and translates for the requested locale', () => {
    expect(localizePath('/jobs/skills/react', { locale: 'fr' })).toBe(
      expectedFor('fr', '/fr/emplois/skills/react'),
    );
    expect(localizePath('/salaries?x=1#y', { locale: 'de' })).toBe(
      expectedFor('de', '/de/gehaelter?x=1#y'),
    );
    expect(localizePath('/companies/jobs', { locale: 'nl' })).toBe(
      expectedFor('nl', '/nl/bedrijven/jobs'),
    );
  });

  it('leaves an already localized board-language path as it is', () => {
    // returnTo values may arrive localized from a previous page.
    const localized = localizePath('/jobs/locations', { locale: baseLocale });
    expect(localizePath(localized, { locale: baseLocale })).toBe(localized);
  });
});

describe('word lists', () => {
  /** Static words at each depth across every route template. */
  function staticWordsByDepth(): Map<number, Set<string>> {
    const byDepth = new Map<number, Set<string>>();
    for (const template of [...ROUTE_TEMPLATES, ...MACHINE_TEMPLATES]) {
      template
        .split('/')
        .filter(Boolean)
        .forEach((part, depth) => {
          if (part.includes('$')) return;
          const words = byDepth.get(depth) ?? new Set<string>();
          words.add(part);
          byDepth.set(depth, words);
        });
    }
    return byDepth;
  }

  it('maps every route position to a distinct, unambiguous word', () => {
    const byDepth = staticWordsByDepth();
    const problems: string[] = [];
    for (const [locale, entries] of Object.entries(SEGMENT_TRANSLATIONS)) {
      const words = new Map<string, string>(Object.entries(entries));
      for (const [depth, canonicalWords] of byDepth) {
        const seen = new Map<string, string>();
        for (const canonical of canonicalWords) {
          const localized = words.get(canonical) ?? canonical;
          const previous = seen.get(localized);
          if (previous !== undefined) {
            problems.push(
              `${locale}: "${previous}" and "${canonical}" both become "${localized}" at depth ${depth}`,
            );
          }
          seen.set(localized, canonical);
          if (localized !== canonical && canonicalWords.has(localized)) {
            problems.push(
              `${locale}: "${canonical}" becomes "${localized}", another route's word at depth ${depth}`,
            );
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('never gives one word two meanings across lists', () => {
    // Input accepts every list's words, so a word must name the same
    // canonical segment in every list and never be another route's word.
    const problems: string[] = [];
    for (const [depth, canonicalWords] of staticWordsByDepth()) {
      const meaning = new Map<string, string>(
        [...canonicalWords].map((word) => [word, word]),
      );
      for (const [locale, entries] of Object.entries(SEGMENT_TRANSLATIONS)) {
        for (const [canonical, localized] of Object.entries(entries)) {
          if (!canonicalWords.has(canonical)) continue;
          const existing = meaning.get(localized);
          if (existing !== undefined && existing !== canonical) {
            problems.push(
              `${locale}: "${localized}" means "${canonical}" but also "${existing}" at depth ${depth}`,
            );
          }
          meaning.set(localized, canonical);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('only lists route segments, in URL-safe form', () => {
    const routeWords = new Set(
      [...staticWordsByDepth().values()].flatMap((words) => [...words]),
    );
    for (const words of Object.values(SEGMENT_TRANSLATIONS)) {
      for (const [canonical, localized] of Object.entries(words)) {
        expect(routeWords).toContain(canonical);
        expect(localized).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      }
    }
  });
});
