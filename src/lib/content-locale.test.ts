import { describe, expect, it } from 'vitest';

import { baseLocale } from '../paraglide/runtime';
import { contentLocaleQuery } from './content-locale';

describe('contentLocaleQuery', () => {
  it('sends nothing for the board language', () => {
    expect(contentLocaleQuery(baseLocale)).toEqual({});
  });

  it('sends the locale as a query parameter for any other language', () => {
    const other = ['de', 'fr'].find((locale) => locale !== baseLocale)!;
    expect(contentLocaleQuery(other)).toEqual({ query: { locale: other } });
  });
});
