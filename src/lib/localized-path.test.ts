import { describe, expect, it } from 'vitest';

import { baseLocale, isLocale } from '../paraglide/runtime';
import URL_WORDS from '../url-words.json';
import {
  canonicalPathname,
  delocalizeSegments,
  isMachinePath,
  localizePath,
  localizeRouteTemplate,
  localizeSegments,
  MACHINE_FIRST_SEGMENTS,
  MACHINE_TEMPLATES,
  stripLocalePrefix,
} from './localized-path';
import { ROUTE_TEMPLATES } from './route-templates';
import { BOARD_URL_WORDS } from './url-words';

import type { LocaleRouting } from './localized-path';
import type { UrlWords } from './url-words';

/** A Dutch board with French and German variants. */
const DUTCH_BOARD: LocaleRouting = {
  baseLocale: 'nl',
  isLocale: (tag) => ['nl', 'fr', 'de'].includes(tag),
  words: URL_WORDS,
};

/** An English board with French and German variants. */
const ENGLISH_BOARD: LocaleRouting = {
  baseLocale: 'en',
  isLocale: (tag) => ['en', 'fr', 'de'].includes(tag),
  words: URL_WORDS,
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
      // German keeps the "jobs" anglicism as its word.
      expect(localizeSegments('/de/jobs/locations/berlin', routing)).toBe(
        '/de/jobs/standorte/berlin',
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
    const japaneseBoard: LocaleRouting = {
      baseLocale: 'ja',
      isLocale: (tag) => tag === 'ja' || tag === 'en',
      words: URL_WORDS,
    };
    expect(localizeSegments('/jobs/locations/x', japaneseBoard)).toBe(
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

  it('only reads the words of the board it is given', () => {
    const withoutDutch: LocaleRouting = { ...DUTCH_BOARD, words: {} };
    expect(localizeSegments('/jobs', withoutDutch)).toBe('/jobs');
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
  /** The compiled build only carries words for compiled locales. */
  function wordsIfCompiled(locale: string, localized: string, raw: string) {
    return isLocale(locale) ? expectedFor(locale, localized) : raw;
  }

  it('prefixes and translates for the requested locale', () => {
    expect(localizePath('/jobs/skills/react', { locale: 'fr' })).toBe(
      wordsIfCompiled(
        'fr',
        '/fr/emplois/competences/react',
        '/fr/jobs/skills/react',
      ),
    );
    expect(localizePath('/salaries?x=1#y', { locale: 'de' })).toBe(
      wordsIfCompiled('de', '/de/gehaelter?x=1#y', '/de/salaries?x=1#y'),
    );
    expect(localizePath('/companies/jobs', { locale: 'nl' })).toBe(
      wordsIfCompiled('nl', '/nl/bedrijven/jobs', '/nl/companies/jobs'),
    );
  });

  it('carries word lists for compiled locales only', () => {
    for (const locale of Object.keys(BOARD_URL_WORDS)) {
      expect(isLocale(locale)).toBe(true);
    }
    if (baseLocale in URL_WORDS) {
      expect(Object.keys(BOARD_URL_WORDS)).toContain(baseLocale);
    }
  });

  it('leaves an already localized board-language path as it is', () => {
    // returnTo values may arrive localized from a previous page.
    const localized = localizePath('/jobs/locations', { locale: baseLocale });
    expect(localizePath(localized, { locale: baseLocale })).toBe(localized);
  });
});

describe('localizeRouteTemplate', () => {
  it('maps static segments and keeps params', () => {
    expect(
      localizeRouteTemplate(
        '/companies/:companySlug/jobs/:jobSlug',
        URL_WORDS.nl,
      ),
    ).toBe('/bedrijven/:companySlug/vacatures/:jobSlug');
    expect(localizeRouteTemplate('/', URL_WORDS.nl)).toBe('/');
    expect(localizeRouteTemplate('/jobs', undefined)).toBe('/jobs');
  });

  it('keeps machine templates canonical', () => {
    expect(localizeRouteTemplate('/jobs/rss.xml', URL_WORDS.nl)).toBe(
      '/jobs/rss.xml',
    );
  });
});

describe('URL word file', () => {
  /** Static words at each depth of the page (non-machine) routes. */
  function pageWordsByDepth(): Map<number, Set<string>> {
    const byDepth = new Map<number, Set<string>>();
    for (const template of ROUTE_TEMPLATES) {
      if (isMachinePath(template, ENGLISH_BOARD)) continue;
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

  /** Static words that only machine routes use (feeds, OG images). */
  function machineSegments(pageWords: ReadonlySet<string>): Set<string> {
    const machine = new Set(MACHINE_FIRST_SEGMENTS);
    for (const template of MACHINE_TEMPLATES) {
      for (const part of template.split('/')) {
        if (part && !part.includes('$') && !pageWords.has(part)) {
          machine.add(part);
        }
      }
    }
    return machine;
  }

  /** Everything that would make a word file unsafe to route with. */
  function wordFileProblems(file: UrlWords): string[] {
    const byDepth = pageWordsByDepth();
    const pageWords = new Set(
      [...byDepth.values()].flatMap((words) => [...words]),
    );
    const machine = machineSegments(pageWords);
    const problems: string[] = [];
    for (const [locale, entries] of Object.entries(file)) {
      for (const [canonical, localized] of Object.entries(entries)) {
        if (machine.has(canonical)) {
          problems.push(`${locale}: "${canonical}" is a machine path`);
        } else if (!pageWords.has(canonical)) {
          problems.push(`${locale}: "${canonical}" is not a route segment`);
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(localized)) {
          problems.push(`${locale}: "${localized}" is not URL-safe`);
        }
        if (machine.has(localized)) {
          problems.push(
            `${locale}: "${canonical}" becomes "${localized}", a machine path`,
          );
        }
      }
      const words = new Map(Object.entries(entries));
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
    return problems;
  }

  it('maps every route position to a distinct, URL-safe word in every language', () => {
    expect(Object.keys(URL_WORDS).length).toBeGreaterThan(1);
    expect(wordFileProblems(URL_WORDS)).toEqual([]);
  });

  it('rejects a word for a segment no route has', () => {
    expect(wordFileProblems({ nl: { careers: 'loopbaan' } })).toEqual([
      'nl: "careers" is not a route segment',
    ]);
  });

  it('rejects machine segments and colliding words', () => {
    expect(wordFileProblems({ nl: { api: 'koppeling' } })).toEqual([
      'nl: "api" is a machine path',
    ]);
    expect(wordFileProblems({ nl: { jobs: 'go' } })).toEqual([
      'nl: "jobs" becomes "go", a machine path',
    ]);
    expect(
      wordFileProblems({ nl: { jobs: 'banen', companies: 'banen' } }),
    ).toContain('nl: "jobs" and "companies" both become "banen" at depth 0');
  });
});
