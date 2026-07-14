import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('public company routes use the owned shadcn layer', () => {
  it('builds the company profile rail and empty states from owned Card, Badge, Button, and Empty', () => {
    const companyRoute = source('./companies.$companySlug.index.tsx');

    expect(companyRoute).toMatch(/from ['"]@\/components\/ui\/card['"]/);
    expect(companyRoute).toMatch(/from ['"]@\/components\/ui\/badge['"]/);
    expect(companyRoute).toMatch(/from ['"]@\/components\/ui\/button['"]/);
    expect(companyRoute).toMatch(/from ['"]@\/components\/ui\/empty['"]/);
    expect(companyRoute).not.toContain('@/components/base/');
    expect(companyRoute).not.toContain('@/components/application/empty-state/');
  });

  it('builds the canonical company-job not-found state from the owned Empty family', () => {
    const jobRoute = source('./companies.$companySlug.jobs.$jobSlug.tsx');

    expect(jobRoute).toMatch(/from ['"]@\/components\/ui\/empty['"]/);
    expect(jobRoute).not.toContain('@/components/application/empty-state/');
    expect(jobRoute).not.toContain('@untitledui/icons');
  });
});
