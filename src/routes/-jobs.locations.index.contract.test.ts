import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('locations index breadcrumb contract', () => {
  it('keeps breadcrumb JSON-LD while the root shell owns visible placement', () => {
    const route = readFileSync(
      resolve(process.cwd(), 'src/routes/jobs.locations.index.tsx'),
      'utf8',
    );
    const page = readFileSync(
      resolve(process.cwd(), 'src/server/jobs-listing-pages.ts'),
      'utf8',
    );

    expect(route).toContain('PageHeader');
    expect(route).not.toContain('PageHeaderWithBreadcrumb');
    expect(route).not.toContain('PageBreadcrumb');
    // JSON-LD breadcrumb trail is computed in the route-owned server page
    // (out of the universal client entry) and emitted via route head()
    // scripts — React 19 streaming SSR can drop body-rendered <script>.
    expect(route).toContain('jsonLdHeadScripts');
    expect(route).toContain('getJobsLocationsIndexPage');
    expect(page).toContain("{ name: crumbs.jobs, path: '/' }");
    expect(page).toContain('{ name: crumbs.locations }');
  });
});
