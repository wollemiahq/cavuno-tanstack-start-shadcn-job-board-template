import { describe, expect, it } from 'vitest';

import {
  LOCALIZED_BUCKETS,
  renderUrlsetWithAlternates,
} from './sitemap-alternates';

const ORIGIN = 'https://board.example';

describe('sitemap locale alternates', () => {
  it('skips hreflang when only one public locale is compiled', () => {
    const xml = renderUrlsetWithAlternates([`${ORIGIN}/jobs`], ORIGIN);
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).not.toContain('hreflang=');
    expect(xml).toContain(`<loc>${ORIGIN}/jobs</loc>`);
  });

  it('keeps lastModified and passes foreign-origin URLs through plain', () => {
    const xml = renderUrlsetWithAlternates(
      [
        { url: `${ORIGIN}/salaries`, lastModified: '2026-08-05' },
        'https://elsewhere.example/x',
      ],
      ORIGIN,
    );
    expect(xml).toContain('<lastmod>2026-08-05</lastmod>');
    expect(xml).not.toContain('hreflang=');
    // A URL outside the origin gets no alternates block.
    expect(xml).not.toContain('elsewhere.example/de');
  });

  it('external-canonical buckets are excluded from alternates', () => {
    // jobs-details canonicalizes to the hosted board; companies/blog may
    // carry per-entry external canonicals — none may declare alternates.
    for (const bucket of ['jobs-details', 'companies', 'blog']) {
      expect(LOCALIZED_BUCKETS).not.toContain(bucket);
    }
  });
});
