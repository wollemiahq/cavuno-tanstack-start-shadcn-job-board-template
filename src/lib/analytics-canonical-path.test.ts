// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import URL_WORDS from '../url-words.json';
import { exposeAnalyticsCanonicalPathname } from './analytics-canonical-path';

import type { LocaleRouting } from './localized-path';

/** A Dutch board with a French variant. */
const DUTCH_BOARD: LocaleRouting = {
  baseLocale: 'nl',
  isLocale: (tag) => ['nl', 'fr'].includes(tag),
  words: URL_WORDS,
};

afterEach(() => {
  delete window.cavunoCanonicalPathname;
});

describe('window.cavunoCanonicalPathname', () => {
  it('maps localized, prefixed and machine paths to canonical paths', () => {
    exposeAnalyticsCanonicalPathname(window, DUTCH_BOARD);
    const map = window.cavunoCanonicalPathname!;
    expect(map('/vacatures')).toBe('/jobs');
    expect(map('/bedrijven/acme/vacatures/dev')).toBe(
      '/companies/acme/jobs/dev',
    );
    expect(map('/fr/entreprises/acme/emplois/dev')).toBe(
      '/companies/acme/jobs/dev',
    );
    expect(map('/fr/emplois')).toBe('/jobs');
    expect(map('/jobs')).toBe('/jobs');
    expect(map('/api/v1/jobs')).toBe('/api/v1/jobs');
    expect(map('/p/jane')).toBe('/p/jane');
    expect(map('/')).toBe('/');
  });

  it('returns the input instead of throwing', () => {
    const throwing: LocaleRouting = {
      ...DUTCH_BOARD,
      isLocale: () => {
        throw new Error('boom');
      },
    };
    exposeAnalyticsCanonicalPathname(window, throwing);
    expect(window.cavunoCanonicalPathname!('/vacatures')).toBe('/vacatures');
  });
});
