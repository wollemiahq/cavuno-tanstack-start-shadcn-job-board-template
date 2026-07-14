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

  it('builds location and skill metadata through the typed router path', () => {
    const route = source('./routes/jobs.locations.$location.skills.$skill.tsx');

    expect(route).toContain('interpolatePath({');
    expect(route).toContain("path: '/jobs/locations/$location/skills/$skill'");
    expect(route).not.toContain(
      'path: `/jobs/locations/${params.location}/skills/${params.skill}`',
    );
  });
});
