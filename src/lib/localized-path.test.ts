import { describe, expect, it } from 'vitest';

import { delocalizeSegments, localizePath } from './localized-path';

describe('localized route slugs', () => {
  it('localizes the section segment per locale', () => {
    expect(localizePath('/jobs', { locale: 'fr' })).toBe('/fr/emplois');
    expect(localizePath('/jobs/skills/react', { locale: 'fr' })).toBe(
      '/fr/emplois/skills/react',
    );
    expect(localizePath('/companies', { locale: 'fr' })).toBe(
      '/fr/entreprises',
    );
    expect(localizePath('/salaries', { locale: 'de' })).toBe('/de/gehaelter');
    expect(localizePath('/talent', { locale: 'de' })).toBe('/de/talente');
    // German keeps the anglicism for jobs.
    expect(localizePath('/jobs', { locale: 'de' })).toBe('/de/jobs');
    // Base locale: no prefix, canonical segments.
    expect(localizePath('/jobs', { locale: 'en' })).toBe('/jobs');
  });

  it('delocalizes translated segments back to canonical', () => {
    expect(delocalizeSegments('/fr/emplois/skills/react')).toBe(
      '/fr/jobs/skills/react',
    );
    expect(delocalizeSegments('/de/gehaelter')).toBe('/de/salaries');
    // Canonical segments under a prefix still work (old links).
    expect(delocalizeSegments('/fr/jobs')).toBe('/fr/jobs');
    // Untranslated locales and unprefixed paths pass through.
    expect(delocalizeSegments('/jobs')).toBe('/jobs');
    expect(delocalizeSegments('/fr/blog/post-x')).toBe('/fr/blog/post-x');
  });
});

describe('edge shapes', () => {
  it('preserves query and hash through both directions', () => {
    expect(localizePath('/jobs?q=react&page=2#results', { locale: 'fr' })).toBe(
      '/fr/emplois?q=react&page=2#results',
    );
    expect(delocalizeSegments('/fr/emplois?q=react#results')).toBe(
      '/fr/jobs?q=react#results',
    );
  });

  it('handles deep nested localized paths', () => {
    expect(
      delocalizeSegments('/fr/emplois/locations/berlin-germany/skills/react'),
    ).toBe('/fr/jobs/locations/berlin-germany/skills/react');
    expect(
      localizePath('/companies/acme/jobs/vp-of-growth', { locale: 'de' }),
    ).toBe('/de/unternehmen/acme/jobs/vp-of-growth');
  });
});
