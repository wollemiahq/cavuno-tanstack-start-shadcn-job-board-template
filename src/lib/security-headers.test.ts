import { describe, expect, it } from 'vitest';

import { withBaselineSecurityHeaders } from './security-headers';

describe('withBaselineSecurityHeaders', () => {
  it('adds the starter-safe response baseline without changing the response', async () => {
    const secured = withBaselineSecurityHeaders(
      new Response('ok', {
        headers: { 'Cache-Control': 'public, max-age=60' },
        status: 201,
        statusText: 'Created',
      }),
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
    );

    expect(secured.headers.get('referrer-policy')).toBe('no-referrer');
    expect(secured.headers.get('x-content-type-options')).toBe('custom-policy');
  });
});
