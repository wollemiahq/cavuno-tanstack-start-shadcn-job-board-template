import { describe, expect, it } from 'vitest';

import URL_WORDS from '../url-words.json';
import { disabledLocaleRedirectPath } from './disabled-locale-redirect';

import type { LocaleRouting } from './localized-path';

/** A Dutch board that turned English off. */
const DUTCH_BOARD: LocaleRouting = {
  baseLocale: 'nl',
  isLocale: (tag) => tag === 'nl',
  words: { nl: URL_WORDS.nl },
};

/** An English board that serves German and turned French off. */
const ENGLISH_BOARD: LocaleRouting = {
  baseLocale: 'en',
  isLocale: (tag) => ['en', 'de'].includes(tag),
  words: { de: URL_WORDS.de },
};

describe('disabled locale redirect path', () => {
  it('lands on the same page in the board language, slugs kept', () => {
    expect(disabledLocaleRedirectPath('/en/jobs', DUTCH_BOARD)).toBe(
      '/vacatures',
    );
    expect(
      disabledLocaleRedirectPath(
        '/en/companies/acme/jobs/designer',
        DUTCH_BOARD,
      ),
    ).toBe('/bedrijven/acme/vacatures/designer');
    expect(
      disabledLocaleRedirectPath('/en/salaries/titles/nurse', DUTCH_BOARD),
    ).toBe('/salarissen/functies/nurse');
    expect(disabledLocaleRedirectPath('/en', DUTCH_BOARD)).toBe('/');
  });

  it("reads a disabled locale's own words", () => {
    expect(
      disabledLocaleRedirectPath('/fr/emplois/lieux/paris', ENGLISH_BOARD),
    ).toBe('/jobs/locations/paris');
    expect(
      disabledLocaleRedirectPath('/fr/entreprises/acme', ENGLISH_BOARD),
    ).toBe('/companies/acme');
  });

  it('only strips the prefix from a path that is no page', () => {
    expect(disabledLocaleRedirectPath('/en/old/page', DUTCH_BOARD)).toBe(
      '/old/page',
    );
  });

  it('leaves served locales, non-language segments and pages alone', () => {
    for (const path of [
      '/nl/vacatures',
      '/de/jobs',
      '/xx/jobs',
      '/vacatures',
      '/',
    ]) {
      const routing = path.startsWith('/de') ? ENGLISH_BOARD : DUTCH_BOARD;
      expect(disabledLocaleRedirectPath(path, routing)).toBeNull();
    }
  });

  it('never points off the site', () => {
    expect(
      disabledLocaleRedirectPath('/en//evil.example', DUTCH_BOARD),
    ).toBeNull();
    expect(
      disabledLocaleRedirectPath('/en/\\evil.example', DUTCH_BOARD),
    ).toBeNull();
  });
});
