import { describe, expect, it } from 'vitest';

import {
  isPseudoLocale,
  PSEUDO_LOCALES,
  publicLocales,
} from './public-locales';

describe('publicLocales', () => {
  it('drops the CI pseudo-locales and keeps human chrome locales', () => {
    expect(publicLocales(['en', 'de', 'fr', ...PSEUDO_LOCALES])).toEqual([
      'en',
      'de',
      'fr',
    ]);
  });

  it('an English-only compile has a single public locale', () => {
    expect(publicLocales(['en'])).toEqual(['en']);
  });

  it('identifies the QA pseudo-locales', () => {
    expect(isPseudoLocale('en-XA')).toBe(true);
    expect(isPseudoLocale('ar-XB')).toBe(true);
    expect(isPseudoLocale('en')).toBe(false);
    expect(isPseudoLocale('de')).toBe(false);
  });
});
