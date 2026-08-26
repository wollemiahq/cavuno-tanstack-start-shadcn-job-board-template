import { describe, expect, it } from 'vitest';

import { topCategoriesFromTaxonomy } from './top-categories';

describe('topCategoriesFromTaxonomy', () => {
  it('returns null when the taxonomy payload is missing or empty', () => {
    expect(topCategoriesFromTaxonomy(undefined)).toBeNull();
    expect(topCategoriesFromTaxonomy([])).toBeNull();
  });

  it('returns null when no term carries a numeric jobCount (older API)', () => {
    expect(
      topCategoriesFromTaxonomy([
        { canonicalSlug: 'cybersecurity', displayName: 'Cybersecurity' },
      ]),
    ).toBeNull();
  });

  it('maps canonical slug, display name, and live jobCount', () => {
    expect(
      topCategoriesFromTaxonomy([
        {
          canonicalSlug: 'cybersecurity',
          displayName: 'Cybersecurity',
          jobCount: 412,
        },
        {
          canonicalSlug: 'incident-response',
          displayName: 'Incident Response',
          jobCount: 88,
        },
      ]),
    ).toEqual([
      {
        type: 'category',
        slug: 'cybersecurity',
        term: 'Cybersecurity',
        count: 412,
      },
      {
        type: 'category',
        slug: 'incident-response',
        term: 'Incident Response',
        count: 88,
      },
    ]);
  });
});
