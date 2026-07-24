import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(import.meta.dirname, 'jobs-not-found.tsx'),
  'utf8',
);
const routeSources = [
  '../../routes/jobs.$keyword.tsx',
  '../../routes/jobs.skills.$skill.tsx',
  '../../routes/jobs.locations.$location.index.tsx',
  '../../routes/jobs.locations.$location.$keyword.tsx',
  '../../routes/jobs.locations.$location.skills.$skill.tsx',
].map((path) => readFileSync(join(import.meta.dirname, path), 'utf8'));

describe('JobsNotFound — search-results recovery', () => {
  it('keeps search recovery controls and catalog-backed copy', () => {
    expect(source).toContain('JobsFilterControls');
    expect(source).toContain('parseJobsSearch');
    expect(source).toContain('jobSearch_noMatchingResultsHeading');
    expect(source).toContain('jobSearch_resetFiltersAction');
    expect(source).toContain('<Link to="/jobs"');
  });

  it('uses the same search-focused recovery state for every missing jobs taxonomy route', () => {
    for (const routeSource of routeSources) {
      expect(routeSource).toContain('<JobsNotFound />');
    }
  });
});
