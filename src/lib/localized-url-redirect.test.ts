import { describe, expect, it } from 'vitest';

import {
  localizedRedirectLocation,
  localizedUrlRedirect,
} from './localized-url-redirect';

import type { LocaleRouting } from './localized-path';

const DUTCH_BOARD: LocaleRouting = {
  baseLocale: 'nl',
  isLocale: (tag) => ['nl', 'fr'].includes(tag),
};

const ENGLISH_BOARD: LocaleRouting = {
  baseLocale: 'en',
  isLocale: (tag) => ['en', 'fr'].includes(tag),
};

function request(path: string, method = 'GET') {
  return { method, url: `https://board.example${path}` };
}

describe('localized URL redirect', () => {
  it('sends canonical document URLs to the localized one, query intact', () => {
    expect(localizedRedirectLocation(request('/jobs'), DUTCH_BOARD)).toBe(
      '/vacatures',
    );
    expect(
      localizedRedirectLocation(request('/jobs/locations?x=1'), DUTCH_BOARD),
    ).toBe('/vacatures/locaties?x=1');
    expect(
      localizedRedirectLocation(request('/fr/jobs', 'HEAD'), DUTCH_BOARD),
    ).toBe('/fr/emplois');
    // A half-translated URL lands on the fully localized one.
    expect(
      localizedRedirectLocation(request('/vacatures/locations'), DUTCH_BOARD),
    ).toBe('/vacatures/locaties');
  });

  it('serves localized URLs as they are, so nothing loops', () => {
    for (const path of [
      '/vacatures',
      '/vacatures/locaties?x=1',
      '/fr/emplois',
      '/',
    ]) {
      expect(localizedRedirectLocation(request(path), DUTCH_BOARD)).toBeNull();
    }
  });

  it('never redirects non-GET requests or machine paths', () => {
    expect(
      localizedRedirectLocation(request('/jobs', 'POST'), DUTCH_BOARD),
    ).toBeNull();
    for (const path of [
      '/jobs/rss.xml',
      '/_serverFn/x',
      '/sitemap.xml',
      '/api/x',
    ]) {
      expect(localizedRedirectLocation(request(path), DUTCH_BOARD)).toBeNull();
    }
  });

  it('leaves an English board alone', () => {
    expect(
      localizedRedirectLocation(request('/jobs/locations'), ENGLISH_BOARD),
    ).toBeNull();
  });

  it('never emits a protocol-relative Location', () => {
    for (const path of ['//evil.example/jobs', '//evil.example/']) {
      expect(localizedRedirectLocation(request(path), DUTCH_BOARD)).toBeNull();
    }
  });

  it('lets browsers cache the 308 for a bounded time only', () => {
    const response = localizedUrlRedirect(
      new Request('https://board.example/jobs'),
      DUTCH_BOARD,
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get('Location')).toBe('/vacatures');
    expect(response?.headers.get('Cache-Control')).toBe('max-age=86400');
  });
});
