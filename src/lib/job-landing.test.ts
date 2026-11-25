import { describe, expect, it } from 'vitest';

import {
  jobLandingCanonicalPath,
  jobLandingConsolidation,
  jobLandingPath,
} from './job-landing';

const consolidation = { places: { region: 'city', country: null } };

describe('job landing pages', () => {
  it('reads no map from a context without one', () => {
    expect(jobLandingConsolidation({})).toBeUndefined();
    expect(jobLandingPath({ placeSlug: 'region' }, undefined)).toBe(
      '/jobs/locations/region',
    );
  });

  it('links the page a place duplicates', () => {
    expect(jobLandingPath({ placeSlug: 'region' }, consolidation)).toBe(
      '/jobs/locations/city',
    );
    expect(jobLandingPath({ placeSlug: 'country' }, consolidation)).toBe(
      '/jobs',
    );
  });

  it('prefers the map, then the listing, then the own path', () => {
    const listing = { canonicalPath: '/jobs/design' };
    expect(
      jobLandingCanonicalPath(
        { placeSlug: 'region', categorySlug: 'design' },
        consolidation,
        listing,
      ),
    ).toBe('/jobs/locations/city/design');
    expect(
      jobLandingCanonicalPath(
        { placeSlug: 'city', categorySlug: 'design' },
        consolidation,
        listing,
      ),
    ).toBe('/jobs/design');
    expect(
      jobLandingCanonicalPath(
        { placeSlug: 'city', skillSlug: 'figma' },
        consolidation,
        {},
      ),
    ).toBe('/jobs/locations/city/skills/figma');
  });
});
