import { describe, expect, it } from 'vitest';

import { toApplyButtonVM } from './apply-view-model';

/**
 * The apply mapper is Layer 1b and owns the decision ladder
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

  it('keeps a server-declared gateway external job out of the SDK native ladder', () => {
    const vm = toApplyButtonVM({
      ...base,
      applicationUrl: null,
      applyAction: 'gateway_external',
      viewer: null,
    });
    expect(vm.action).toEqual({
      kind: 'gateway-external',
      jobSlug: 'senior-eng',
    });
  });

  it('honours a server-declared native action even if a stale URL is present', () => {
    const vm = toApplyButtonVM({
      ...base,
      applicationUrl: 'https://stale.example/apply',
      applyAction: 'native',
      viewer: { emailVerified: true },
    });
    expect(vm.action).toEqual({ kind: 'native', jobSlug: 'senior-eng' });
  });

  it('keeps a gateway-native job on the authenticated native ladder', () => {
    const vm = toApplyButtonVM({
      ...base,
      applicationUrl: 'https://stale.example/apply',
      applyAction: 'gateway_native',
      viewer: { emailVerified: true },
    });
    expect(vm.action).toEqual({ kind: 'native', jobSlug: 'senior-eng' });
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

describe('toApplyButtonVM — nativeApplications off (external-apply-only)', () => {
  it('keeps an external URL applyable for everyone', () => {
    const vm = toApplyButtonVM({
      ...base,
      jobSlug: null,
      applicationUrl: 'https://jobs.acme.com/123',
      viewer: null,
      nativeApplications: false,
    });
    expect(vm.action).toEqual({
      kind: 'external',
      url: 'https://jobs.acme.com/123',
    });
  });

  it.each([
    { name: 'anonymous native job (would be sign-in)', viewer: null },
    {
      name: 'unverified native job (would be verify-email)',
      viewer: { emailVerified: false },
    },
    {
      name: 'verified native job (would be native)',
      viewer: { emailVerified: true },
    },
  ])('collapses a $name to a non-applyable state', ({ viewer }) => {
    const vm = toApplyButtonVM({ ...base, viewer, nativeApplications: false });
    expect(vm.action.kind).toBe('none');
  });

  it('never shows a dead-end applied link once native apply is disabled', () => {
    const vm = toApplyButtonVM({
      ...base,
      viewer: { emailVerified: true },
      applied: true,
      nativeApplications: false,
    });
    expect(vm.action.kind).toBe('none');
  });
});

describe('toApplyButtonVM — copy', () => {
  it('resolves every label the markup renders', () => {
    const vm = toApplyButtonVM({ ...base, viewer: { emailVerified: true } });
    for (const label of Object.values(vm.copy)) {
      expect(label).toBeTypeOf('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
