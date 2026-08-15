import { describe, expect, it } from 'vitest';

import {
  adsTxtResponse,
  indexNowResponse,
  robotsResponse,
} from './seo-handlers';

describe('seo-handlers — byte-parity with the hosted board', () => {
  it('robots.txt: User-Agent (capital), listing pagination Disallow, Sitemap on the canonical base', async () => {
    const res = robotsResponse({ canonicalBase: 'https://acme.cavuno.com' });
    expect(await res.text()).toBe(
      [
        'User-Agent: *',
        'Allow: /',
        'Disallow: /jobs?page=',
        'Disallow: /jobs*&page=',
        'Disallow: /jobs/*?page=',
        'Disallow: /companies?page=',
        'Disallow: /companies*&page=',
        'Disallow: /companies/*?page=',
        '',
        'Sitemap: https://acme.cavuno.com/sitemap.xml',
        '',
      ].join('\n'),
    );
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe(
      'public, max-age=600, s-maxage=14400, stale-while-revalidate=86400',
    );
  });

  it('robots.txt: honours a custom domain in the canonical base', async () => {
    const res = robotsResponse({ canonicalBase: 'https://careers.acme.com' });
    expect(await res.text()).toContain(
      'Sitemap: https://careers.acme.com/sitemap.xml',
    );
  });

  it('ads.txt: serves the content with the hosted cache header; 404 when unconfigured', async () => {
    const ok = adsTxtResponse({ adsTxt: 'google.com, pub-123, DIRECT' });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('google.com, pub-123, DIRECT');
    expect(ok.headers.get('cache-control')).toBe(
      'public, max-age=3600, must-revalidate',
    );
    expect(adsTxtResponse({ adsTxt: null }).status).toBe(404);
  });

  it('indexnow-key.txt: serves the key with the hosted cache header; 404 when unconfigured', async () => {
    const ok = indexNowResponse({ indexNowKey: 'abc123key' });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('abc123key');
    expect(ok.headers.get('cache-control')).toBe(
      'public, max-age=86400, must-revalidate',
    );
    expect(indexNowResponse({ indexNowKey: null }).status).toBe(404);
  });
});
