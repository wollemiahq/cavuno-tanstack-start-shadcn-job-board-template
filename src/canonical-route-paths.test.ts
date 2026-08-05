import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('canonical board paths', () => {
  it('builds company salary category links through the typed router path', () => {
    const route = source('./routes/companies.$companySlug.index.tsx');

    expect(route).toContain('interpolatePath({');
    expect(route).toContain(
      "path: '/companies/$companySlug/salaries/$categorySlug'",
    );
    expect(route).not.toContain(
      'href: `/companies/${company.slug}/salaries/${category.categorySlug}`',
    );
  });

  it('builds location and skill metadata through the route-owned server page path', () => {
    // Head path is computed in jobs-listing-pages (not the route module) so
    // `@cavuno/board/seo` stays out of the universal client entry. The
    // canonical path must still be the fixed /jobs/locations/…/skills/…
    // shape — never a loose template that drifts from the route tree.
    const page = source('./server/jobs-listing-pages.ts');

    expect(page).toContain(
      // localizeHref wraps the canonical path so /de//fr/ variants
      // self-canonicalize; the canonical (delocalized) template is unchanged.
      '`/jobs/locations/${data.locationSlug}/skills/${data.skillSlug}`',
    );
    expect(page).not.toContain(
      'path: `/jobs/locations/${params.location}/skills/${params.skill}`',
    );
  });
});
