import { describe, expect, it } from 'vitest';

import URL_WORDS from '../url-words.json';
import { mdUrlRedirect, mdUrlRedirectLocation } from './md-url-redirect';

import type { LocaleRouting } from './localized-path';

const DUTCH_BOARD: LocaleRouting = {
  baseLocale: 'nl',
  isLocale: (tag) => ['nl', 'fr'].includes(tag),
  words: URL_WORDS,
};

function request(path: string, method = 'GET') {
  return { method, url: `https://board.example${path}` };
}

describe('mdUrlRedirectLocation', () => {
  it.each([
    ['/index.md', '/'],
    ['/fr/index.md', '/fr'],
    ['/vacatures.md', '/vacatures'],
    ['/fr/emplois.md?page=2&q=a', '/fr/emplois?page=2&q=a'],
    [
      '/bedrijven/acme/vacatures/caf%C3%A9.md',
      '/bedrijven/acme/vacatures/caf%C3%A9',
    ],
    ['/onbekend.md', '/onbekend'],
  ])('sends %s to %s', (path, location) => {
    expect(mdUrlRedirectLocation(request(path), DUTCH_BOARD)).toBe(location);
    expect(mdUrlRedirectLocation(request(path, 'HEAD'), DUTCH_BOARD)).toBe(
      location,
    );
  });

  it.each([
    '/vacatures',
    '/vacatures/.md',
    '/.md',
    '//evil.example.md',
    '/sitemap.xml.md',
    '/robots.txt.md',
    '/llms.txt.md',
    '/jobs/rss.xml.md',
    '/companies/acme/jobs/x/og.md',
    '/_serverFn/abc.md',
  ])('leaves %s alone', (path) => {
    expect(mdUrlRedirectLocation(request(path), DUTCH_BOARD)).toBeNull();
  });

  it('never redirects a POST', () => {
    expect(
      mdUrlRedirectLocation(request('/vacatures.md', 'POST'), DUTCH_BOARD),
    ).toBeNull();
  });

  it('answers a permanent, bounded redirect', () => {
    const response = mdUrlRedirect(
      new Request('https://board.example/vacatures.md'),
      DUTCH_BOARD,
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe('/vacatures');
    expect(response?.headers.get('cache-control')).toBe('max-age=86400');
  });
});
