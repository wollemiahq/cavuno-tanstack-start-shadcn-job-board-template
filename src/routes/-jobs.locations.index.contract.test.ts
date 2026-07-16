import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('locations index breadcrumb contract', () => {
  it('keeps breadcrumb JSON-LD while the root shell owns visible placement', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/jobs.locations.index.tsx'),
      'utf8',
    );

    expect(source).toContain('PageHeader');
    expect(source).not.toContain('PageHeaderWithBreadcrumb');
    expect(source).not.toContain('PageBreadcrumb');
    expect(source).toContain("{ name: crumbs.jobs, path: '/' }");
    expect(source).toContain('{ name: crumbs.locations }');
  });
});
