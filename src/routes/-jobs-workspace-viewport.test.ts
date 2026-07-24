import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const listingRoutes = [
  'jobs.index.tsx',
  'jobs.$keyword.tsx',
  'jobs.skills.$skill.tsx',
  'jobs.locations.$location.index.tsx',
  'jobs.locations.$location.$keyword.tsx',
  'jobs.locations.$location.skills.$skill.tsx',
  'companies.index.tsx',
  'companies.markets.$market.tsx',
];

describe('search workspace viewport contract', () => {
  it.each(listingRoutes)(
    '%s opts into the bounded search workspace',
    (file) => {
      const source = readFileSync(
        resolve(process.cwd(), 'src/routes', file),
        'utf8',
      );

      expect(source).toContain('fillsViewport: true');
    },
  );
});
