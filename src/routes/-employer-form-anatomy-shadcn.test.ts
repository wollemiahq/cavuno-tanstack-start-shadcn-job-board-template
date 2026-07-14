import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('employer forms use the owned shadcn anatomy', () => {
  it('composes onboarding fields, errors, statuses, and actions from owned primitives', () => {
    const route = source('./employers.onboarding.$slug.tsx');

    expect(route).toContain("from '@/components/ui/field'");
    expect(route).toMatch(/<Field\b/);
    expect(route).toContain('<FieldError>');
    expect(route).toContain("from '@/components/ui/alert'");
    expect(route).toContain('<Alert');
    expect(route).toContain("from '@/components/ui/button-group'");
    expect(route).toContain('<ButtonGroup');
    expect(route).toContain("from '@/components/ui/spinner'");
    expect(route).toContain('<Spinner');
    expect(route).not.toContain('LoaderCircle');
    expect(route).not.toContain('<Label');
  });

  it('composes profile editing fields and feedback from Field and Alert', () => {
    const route = source('./employers.companies.$slug.profile.tsx');

    expect(route).toContain("from '@/components/ui/field'");
    expect(route).toContain('<Field>');
    expect(route).toContain('<FieldError>');
    expect(route).toContain("from '@/components/ui/alert'");
    expect(route).toContain('<Alert');
    expect(route).not.toContain('<Label');
  });

  it('composes applicant inputs, grouped actions, errors, and timeline items from owned primitives', () => {
    const route = source(
      './employers.companies.$slug.jobs.$jobId.applicants.tsx',
    );

    expect(route).toContain("from '@/components/ui/input-group'");
    expect(route).toContain('<InputGroup>');
    expect(route).toContain("from '@/components/ui/button-group'");
    expect(route).toContain('<ButtonGroup');
    expect(route).toContain("from '@/components/ui/field'");
    expect(route).toContain('<FieldError>');
    expect(route).toContain("from '@/components/ui/item'");
    expect(route).toContain('<ItemGroup');
  });

  it('composes dashboard company rows and errors from Item, Field, and Alert', () => {
    const route = source('./employers.dashboard.tsx');

    expect(route).toContain("from '@/components/ui/item'");
    expect(route).toContain('<Item');
    expect(route).toContain('<ItemContent>');
    expect(route).toContain("from '@/components/ui/alert'");
    expect(route).toContain('<Alert');
    expect(route).toContain('<FieldError>');
    expect(route).toContain("from '@/components/ui/spinner'");
    expect(route).toContain('<Spinner');
    expect(route).not.toContain('LoaderCircle');
  });
});
