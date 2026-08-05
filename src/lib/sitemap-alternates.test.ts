import { describe, expect, it } from 'vitest';

import {
  LOCALIZED_BUCKETS,
  renderUrlsetWithAlternates,
} from './sitemap-alternates';

const ORIGIN = 'https://board.example';

describe('sitemap locale alternates', () => {
  it('emits xhtml:link alternates with translated slugs per URL', () => {
    const xml = renderUrlsetWithAlternates([`${ORIGIN}/jobs`], ORIGIN);
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="fr" href="${ORIGIN}/fr/emplois"/>`,
    );
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="de" href="${ORIGIN}/de/jobs"/>`,
    );
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/jobs"/>`,
    );
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
    expect(xml).toContain(`href="${ORIGIN}/de/gehaelter"`);
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
