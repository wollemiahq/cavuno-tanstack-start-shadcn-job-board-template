import { describe, expect, it } from 'vitest';

import URL_WORDS from '../../url-words.json';
import {
  isMarkdownTwinRoutePath,
  markdownPathFor,
  markdownTwinRedirectLocation,
  markdownTwinRequestUrl,
  markdownTwinRouteRequest,
  resolveMarkdownTwin,
} from './routes';

import type { LocaleRouting } from '../localized-path';

/** A Dutch board with a French variant. */
const DUTCH_BOARD: LocaleRouting = {
  baseLocale: 'nl',
  isLocale: (tag) => ['nl', 'fr'].includes(tag),
  words: URL_WORDS,
  previousWords: { nl: { jobs: ['banen'] } },
};

/** An English board with a French variant and no localized words. */
const ENGLISH_BOARD: LocaleRouting = {
  baseLocale: 'en',
  isLocale: (tag) => ['en', 'fr'].includes(tag),
  words: {},
};

function get(path: string, method = 'GET') {
  return { method, url: `https://board.example${path}` };
}

describe('resolveMarkdownTwin', () => {
  it('resolves a job detail twin with decoded params', () => {
    expect(
      resolveMarkdownTwin(
        get('/companies/acme/jobs/caf%C3%A9-chef.md?ref=x'),
        ENGLISH_BOARD,
      ),
    ).toEqual({
      kind: 'job',
      params: { companySlug: 'acme', jobSlug: 'café-chef' },
      htmlPath: '/companies/acme/jobs/caf%C3%A9-chef',
      twinPath: '/companies/acme/jobs/caf%C3%A9-chef.md',
    });
  });

  it('answers HEAD as well as GET, and nothing else', () => {
    const path = '/companies/acme/jobs/designer.md';
    expect(resolveMarkdownTwin(get(path, 'HEAD'), ENGLISH_BOARD)).not.toBe(
      null,
    );
    expect(resolveMarkdownTwin(get(path, 'POST'), ENGLISH_BOARD)).toBeNull();
  });

  it('resolves localized, prefixed and retired words', () => {
    for (const path of [
      '/bedrijven/acme/vacatures/designer.md',
      '/companies/acme/jobs/designer.md',
      '/bedrijven/acme/banen/designer.md',
      '/fr/companies/acme/jobs/designer.md',
    ]) {
      expect(resolveMarkdownTwin(get(path), DUTCH_BOARD)?.params).toEqual({
        companySlug: 'acme',
        jobSlug: 'designer',
      });
    }
  });

  it.each([
    ['the page itself', '/companies/acme/jobs/designer'],
    ['a twin of a twin', '/companies/acme/jobs/designer.md.md'],
    ['a page without a twin yet', '/jobs.md'],
    ['an unknown path', '/no/such/page.md'],
    ['a company page', '/companies/acme.md'],
    ['an empty last segment', '/companies/acme/jobs/designer/.md'],
    ['a machine path', '/api/companies/acme/jobs/designer.md'],
    ['the internal twin route', '/markdown-twin/companies/a/jobs/b.md'],
    ['a malformed escape', '/companies/acme/jobs/%E0%A4%A.md'],
  ])('refuses %s', (_label, path) => {
    expect(resolveMarkdownTwin(get(path), ENGLISH_BOARD)).toBeNull();
  });
});

describe('markdownTwinRedirectLocation', () => {
  function locationFor(path: string) {
    const request = get(path);
    const twin = resolveMarkdownTwin(request, DUTCH_BOARD);
    if (!twin) throw new Error(`no twin for ${path}`);
    return markdownTwinRedirectLocation(request, twin, DUTCH_BOARD);
  }

  it('moves canonical and retired words to the localized twin', () => {
    expect(locationFor('/companies/acme/jobs/designer.md?ref=x')).toBe(
      '/bedrijven/acme/vacatures/designer.md?ref=x',
    );
    expect(locationFor('/bedrijven/acme/banen/designer.md')).toBe(
      '/bedrijven/acme/vacatures/designer.md',
    );
  });

  it('leaves a localized twin where it is', () => {
    expect(locationFor('/bedrijven/acme/vacatures/designer.md')).toBeNull();
  });
});

describe('markdownPathFor', () => {
  it('names the home page index.md', () => {
    expect(markdownPathFor('/', DUTCH_BOARD)).toBe('/index.md');
    expect(markdownPathFor('/fr', DUTCH_BOARD)).toBe('/fr/index.md');
    expect(markdownPathFor('/vacatures/', DUTCH_BOARD)).toBe('/vacatures.md');
  });
});

describe('the internal twin route', () => {
  it('round-trips a twin request through the route path', () => {
    const request = new Request(
      'https://board.example/companies/acme/jobs/designer.md?ref=x',
      { headers: { cookie: 'a=b' } },
    );
    const routed = markdownTwinRouteRequest(request);
    expect(new URL(routed.url).pathname).toBe(
      '/markdown-twin/companies/acme/jobs/designer.md',
    );
    expect(routed.headers.get('cookie')).toBe('a=b');
    expect(markdownTwinRequestUrl(routed.url).href).toBe(request.url);
  });

  it('recognises the route under a locale prefix', () => {
    expect(isMarkdownTwinRoutePath('/markdown-twin/x', DUTCH_BOARD)).toBe(true);
    expect(isMarkdownTwinRoutePath('/fr/markdown-twin/x', DUTCH_BOARD)).toBe(
      true,
    );
    expect(isMarkdownTwinRoutePath('/markdown-twins', DUTCH_BOARD)).toBe(false);
  });
});
