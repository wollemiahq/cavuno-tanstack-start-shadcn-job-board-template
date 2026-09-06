import { describe, expect, it } from 'vitest';

import {
  isEmbeddablePath,
  withBaselineSecurityHeaders,
} from './security-headers';

const PAGE = new Request('https://careers.example.com/jobs');
const EMBED = new Request('https://careers.example.com/embed/jobs');

describe('withBaselineSecurityHeaders', () => {
  it('adds the starter-safe response baseline without changing the response', async () => {
    const secured = withBaselineSecurityHeaders(
      new Response('ok', {
        headers: { 'Cache-Control': 'public, max-age=60' },
        status: 201,
        statusText: 'Created',
      }),
      PAGE,
    );

    expect(secured.status).toBe(201);
    expect(secured.statusText).toBe('Created');
    expect(await secured.text()).toBe('ok');
    expect(secured.headers.get('cache-control')).toBe('public, max-age=60');
    expect(secured.headers.get('x-content-type-options')).toBe('nosniff');
    expect(secured.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    );
  });

  it('preserves a route or operator override', () => {
    const secured = withBaselineSecurityHeaders(
      new Response(null, {
        headers: {
          'Referrer-Policy': 'no-referrer',
          'X-Content-Type-Options': 'custom-policy',
        },
      }),
      PAGE,
    );

    expect(secured.headers.get('referrer-policy')).toBe('no-referrer');
    expect(secured.headers.get('x-content-type-options')).toBe('custom-policy');
  });
});

/**
 * The starter used to send no framing headers at all, because `/embed/jobs`
 * has to stay embeddable. That left `/settings`, `/password` and the company
 * danger zone clickjackable on every fork — and a fork is exactly where this
 * cannot be patched later. Embeddability is per route, so the header is too.
 */
function headersFor(path: string) {
  const response = withBaselineSecurityHeaders(
    new Response('<html></html>'),
    new Request(`https://careers.example.com${path}`),
  );
  return {
    csp: response.headers.get('content-security-policy'),
    xfo: response.headers.get('x-frame-options'),
    referrer: response.headers.get('referrer-policy'),
  };
}

describe('framing is denied everywhere except the embed widget', () => {
  it.each([
    '/',
    '/jobs',
    '/settings',
    '/password',
    '/account',
    '/employers/companies/acme/profile',
  ])('denies framing on %s', (path) => {
    const h = headersFor(path);
    expect(h.csp).toBe("frame-ancestors 'none'");
    expect(h.xfo).toBe('DENY');
  });

  it('leaves /embed/jobs embeddable', () => {
    const h = headersFor('/embed/jobs');
    expect(h.csp).toBeNull();
    expect(h.xfo).toBeNull();
  });

  it('still applies the baseline to the embed route', () => {
    expect(headersFor('/embed/jobs').referrer).toBe(
      'strict-origin-when-cross-origin',
    );
  });

  it('only strips a leading segment that is a REAL enabled locale', () => {
    // A stock build enables `en` only, so `/de/embed/jobs` is not a route
    // yet and must stay denied — the safe direction. Once an operator runs
    // `pnpm locale:add de`, isLocale('de') turns true and the same path
    // becomes embeddable without another code change.
    expect(isEmbeddablePath('/embed/jobs')).toBe(true);
    expect(isEmbeddablePath('/en/embed/jobs')).toBe(true);
    expect(isEmbeddablePath('/xx/embed/jobs')).toBe(false);
    // And nothing embed-shaped elsewhere in the path opens the deny.
    expect(isEmbeddablePath('/companies/embed')).toBe(false);
    expect(isEmbeddablePath('/embedded/jobs')).toBe(false);
  });

  it('never downgrades a stricter framing header a route already set', () => {
    const secured = withBaselineSecurityHeaders(
      new Response('', { headers: { 'X-Frame-Options': 'SAMEORIGIN' } }),
      new Request('https://careers.example.com/jobs'),
    );
    expect(secured.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('does not frame-deny the embed route even via the client-error path', () => {
    const secured = withBaselineSecurityHeaders(new Response('{}'), EMBED);
    expect(secured.headers.get('content-security-policy')).toBeNull();
  });
});
