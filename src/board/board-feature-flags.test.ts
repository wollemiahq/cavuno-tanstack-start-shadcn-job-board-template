import { describe, expect, it } from 'vitest';

import { resolveRuntimeFeatureFlags } from './board-feature-flags';

/**
 * The runtime flags (Board PR #968) ride the board context ahead of the
 * pinned SDK's types. Polarity is additive / default-ON: a flag ABSENT from
 * an older API deployment means the feature is available, mirroring the
 * platform's enforcement. These pin that boundary defaulting so no surface
 * mis-reads an unset flag as "off".
 */
type RuntimeFeatureInput = Parameters<typeof resolveRuntimeFeatureFlags>[0];

function features(
  extra: Partial<RuntimeFeatureInput> = {},
): RuntimeFeatureInput {
  return {
    jobAlerts: true,
    candidates: true,
    employers: true,
    blog: true,
    talentDirectory: 'public',
    registrationWall: false,
    passwordProtected: false,
    publicJobSubmission: true,
    candidatePaywall: false,
    impressum: false,
    nativeApplications: true,
    messaging: true,
    ...extra,
  };
}

describe('resolveRuntimeFeatureFlags', () => {
  it('defaults both flags to ON when absent (older API deployment)', () => {
    const legacyFeatures = features();
    Reflect.deleteProperty(legacyFeatures, 'nativeApplications');
    Reflect.deleteProperty(legacyFeatures, 'messaging');
    expect(resolveRuntimeFeatureFlags(legacyFeatures)).toEqual({
      nativeApplications: true,
      messaging: true,
    });
  });

  it('honors an explicit false for each flag', () => {
    expect(
      resolveRuntimeFeatureFlags(
        features({ nativeApplications: false, messaging: false }),
      ),
    ).toEqual({ nativeApplications: false, messaging: false });
  });

  it('honors an explicit true for each flag', () => {
    expect(
      resolveRuntimeFeatureFlags(
        features({ nativeApplications: true, messaging: true }),
      ),
    ).toEqual({ nativeApplications: true, messaging: true });
  });

  it('resolves each flag independently', () => {
    expect(
      resolveRuntimeFeatureFlags(
        features({ nativeApplications: false, messaging: true }),
      ),
    ).toEqual({ nativeApplications: false, messaging: true });
  });
});
