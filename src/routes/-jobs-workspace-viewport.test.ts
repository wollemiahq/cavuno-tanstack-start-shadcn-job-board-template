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

  it('lets the real responsive header size the workspace instead of subtracting a magic height', () => {
    const root = readFileSync(
      resolve(process.cwd(), 'src/routes/__root.tsx'),
      'utf8',
    );

    expect(root).toContain('fillsViewport?: boolean');
    expect(root).toContain('md:grid-rows-[auto_minmax(0,1fr)]');
    expect(root).toContain('md:h-dvh');
    expect(root).toContain("'flex-1 md:h-full md:min-h-0'");
  });

  it('joins the footer directly to a viewport-filling workspace', () => {
    const root = readFileSync(
      resolve(process.cwd(), 'src/routes/__root.tsx'),
      'utf8',
    );
    const footer = readFileSync(
      resolve(process.cwd(), 'src/components/Footer.tsx'),
      'utf8',
    );

    expect(root).toContain('flush={fillsViewport}');
    expect(footer).toContain("flush ? 'mt-16 md:mt-0' : 'mt-16'");
  });
});
