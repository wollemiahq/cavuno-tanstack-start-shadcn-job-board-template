import { describe, expect, it } from 'vitest';

import { toApplyButtonVM } from './apply-view-model';

/**
 * The apply mapper is Layer 1b — it owns the decision ladder (ADR-0054)
 * and the copy resolution. These pin the ladder so the pure-markup button
 * can be restyled without the invariant drifting: an external URL is the
 * apply path for everyone; only a native job with no URL gates an
 * unverified candidate; an applied job shows the applications link.
 */
const base = {
  jobSlug: 'senior-eng',
  applicationUrl: null,
  language: 'en',
  applied: false,
} as const;

describe('toApplyButtonVM — decision ladder', () => {
  it('routes an external URL to the employer site for EVERYONE (even anonymous)', () => {
    const vm = toApplyButtonVM({
      ...base,
      jobSlug: null,
      applicationUrl: 'https://jobs.acme.com/123',
      viewer: null,
    });
    expect(vm.action).toEqual({
      kind: 'external',
      url: 'https://jobs.acme.com/123',
    });
  });

  it('sends an anonymous visitor on a native job to sign-in', () => {
    const vm = toApplyButtonVM({ ...base, viewer: null });
    expect(vm.action.kind).toBe('sign-in');
  });

  it('gates an unverified candidate on a native job at the verify wall', () => {
    const vm = toApplyButtonVM({ ...base, viewer: { emailVerified: false } });
    expect(vm.action.kind).toBe('verify-email');
  });

  it('lets a verified candidate apply natively', () => {
    const vm = toApplyButtonVM({ ...base, viewer: { emailVerified: true } });
    expect(vm.action).toEqual({ kind: 'native', jobSlug: 'senior-eng' });
  });

  it('shows the applications link once applied', () => {
    const vm = toApplyButtonVM({
      ...base,
      viewer: { emailVerified: true },
      applied: true,
    });
    expect(vm.action.kind).toBe('applied');
  });

  it('renders nothing when a job is neither native nor external', () => {
    const vm = toApplyButtonVM({
      ...base,
      jobSlug: null,
      applicationUrl: null,
      viewer: null,
    });
    expect(vm.action.kind).toBe('none');
  });
});

describe('toApplyButtonVM — copy', () => {
  it('resolves every label the markup renders', () => {
    const vm = toApplyButtonVM({ ...base, viewer: { emailVerified: true } });
    for (const label of Object.values(vm.copy)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
