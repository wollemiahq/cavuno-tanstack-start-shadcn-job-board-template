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

/**
 * Registration wall (hosted parity). Hosted `job-apply-button.tsx` gates on
 * `registrationWallEnabled && !candidate` and wraps even the external
 * employer link in the auth dialog; the platform separately rejects
 * anonymous guest applies on a walled board. Sign-in — not verification —
 * is the bar.
 */
describe('toApplyButtonVM — registrationWall', () => {
  const external = 'https://jobs.acme.com/123';

  it('walls the external employer link from an anonymous visitor', () => {
    const vm = toApplyButtonVM({
      ...base,
      applicationUrl: external,
      viewer: null,
      registrationWall: true,
    });
    expect(vm.action).toEqual({ kind: 'sign-in', reason: 'registration-wall' });
  });

  it('lets a signed-in but UNVERIFIED candidate through to the external link', () => {
    const vm = toApplyButtonVM({
      ...base,
      applicationUrl: external,
      viewer: { emailVerified: false },
      registrationWall: true,
    });
    expect(vm.action).toEqual({ kind: 'external', url: external });
  });

  it('walls the gateway_external contract too', () => {
    const vm = toApplyButtonVM({
      ...base,
      applyAction: 'gateway_external',
      viewer: null,
      registrationWall: true,
    });
    expect(vm.action).toEqual({ kind: 'sign-in', reason: 'registration-wall' });
  });

  it('leaves gateway_external intact for a signed-in candidate', () => {
    const vm = toApplyButtonVM({
      ...base,
      applyAction: 'gateway_external',
      viewer: { emailVerified: false },
      registrationWall: true,
    });
    expect(vm.action).toEqual({
      kind: 'gateway-external',
      jobSlug: 'senior-eng',
    });
  });

  it('keeps the wall CTA on an external job when native apply is off', () => {
    const vm = toApplyButtonVM({
      ...base,
      applicationUrl: external,
      viewer: null,
      registrationWall: true,
      nativeApplications: false,
    });
    expect(vm.action).toEqual({ kind: 'sign-in', reason: 'registration-wall' });
  });

  it('drops the wall CTA when native apply is off and there is no external link to reveal', () => {
    // Signing in would expose nothing — a dead-end CTA is worse than none.
    const vm = toApplyButtonVM({
      ...base,
      viewer: null,
      registrationWall: true,
      nativeApplications: false,
    });
    expect(vm.action.kind).toBe('none');
  });

  it('shows nothing when the wall is up but the job has no apply path at all', () => {
    const vm = toApplyButtonVM({
      ...base,
      jobSlug: null,
      viewer: null,
      registrationWall: true,
    });
    expect(vm.action.kind).toBe('none');
  });

  it('wall off is the pre-existing behaviour: anonymous gets the external link', () => {
    const vm = toApplyButtonVM({
      ...base,
      applicationUrl: external,
      viewer: null,
      registrationWall: false,
    });
    expect(vm.action).toEqual({ kind: 'external', url: external });
  });
});

describe('toApplyButtonVM — allowGuestApply', () => {
  it('routes an anonymous visitor to the guest form when the UI has one', () => {
    const vm = toApplyButtonVM({
      ...base,
      viewer: null,
      allowGuestApply: true,
    });
    expect(vm.action).toEqual({ kind: 'guest', jobSlug: 'senior-eng' });
  });

  it('keeps sign-in when the UI has no guest form', () => {
    const vm = toApplyButtonVM({ ...base, viewer: null });
    expect(vm.action).toEqual({ kind: 'sign-in', reason: 'native-apply' });
  });

  it('the wall beats the guest form', () => {
    const vm = toApplyButtonVM({
      ...base,
      viewer: null,
      allowGuestApply: true,
      registrationWall: true,
    });
    expect(vm.action).toEqual({ kind: 'sign-in', reason: 'registration-wall' });
  });

  it('an external-applications-only board collapses the guest form away', () => {
    const vm = toApplyButtonVM({
      ...base,
      viewer: null,
      allowGuestApply: true,
      nativeApplications: false,
    });
    expect(vm.action.kind).toBe('none');
  });
});
