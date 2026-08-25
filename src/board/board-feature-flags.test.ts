import { describe, expect, it } from 'vitest';

import {
  type RuntimeBoardFeatureFlags,
  resolveRuntimeFeatureFlags,
  resolveTalentDirectoryVisibility,
} from './board-feature-flags';

/**
 * The runtime flags (Board PR #968) ride the board context ahead of the
 * pinned SDK's types. Job recommendations preserve shipped behavior when
 * absent; Recommended talent remains opt-in and therefore defaults off.
 */
type RuntimeFeatureInput = Parameters<typeof resolveRuntimeFeatureFlags>[0];
type RuntimeFeatureFixture = Omit<
  RuntimeFeatureInput,
  keyof RuntimeBoardFeatureFlags
> &
  Partial<RuntimeBoardFeatureFlags>;

function features(
  extra: Partial<RuntimeFeatureFixture> = {},
): RuntimeFeatureFixture {
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
  it('keeps Job recommendations on and Recommended talent off when absent', () => {
    const legacyFeatures = features();
    Reflect.deleteProperty(legacyFeatures, 'nativeApplications');
    Reflect.deleteProperty(legacyFeatures, 'messaging');
    Reflect.deleteProperty(legacyFeatures, 'jobRecommendationsEnabled');
    Reflect.deleteProperty(legacyFeatures, 'recommendedTalentEnabled');
    expect(resolveRuntimeFeatureFlags(legacyFeatures)).toEqual({
      nativeApplications: true,
      messaging: true,
      jobRecommendationsEnabled: true,
      recommendedTalentEnabled: false,
    });
  });

  it('honors an explicit false for each flag', () => {
    expect(
      resolveRuntimeFeatureFlags(
        features({
          nativeApplications: false,
          messaging: false,
          jobRecommendationsEnabled: false,
          recommendedTalentEnabled: false,
        }),
      ),
    ).toEqual({
      nativeApplications: false,
      messaging: false,
      jobRecommendationsEnabled: false,
      recommendedTalentEnabled: false,
    });
  });

  it('honors an explicit true for each flag', () => {
    expect(
      resolveRuntimeFeatureFlags(
        features({
          nativeApplications: true,
          messaging: true,
          jobRecommendationsEnabled: true,
          recommendedTalentEnabled: true,
        }),
      ),
    ).toEqual({
      nativeApplications: true,
      messaging: true,
      jobRecommendationsEnabled: true,
      recommendedTalentEnabled: true,
    });
  });

  it('resolves each flag independently', () => {
    expect(
      resolveRuntimeFeatureFlags(
        features({
          nativeApplications: false,
          messaging: true,
          jobRecommendationsEnabled: false,
          recommendedTalentEnabled: true,
        }),
      ),
    ).toEqual({
      nativeApplications: false,
      messaging: true,
      jobRecommendationsEnabled: false,
      recommendedTalentEnabled: true,
    });
  });
});

describe('resolveTalentDirectoryVisibility', () => {
  it('preserves an off enum when the explicit preview value is absent', () => {
    expect(resolveTalentDirectoryVisibility(null, 'off')).toBe('off');
    expect(resolveTalentDirectoryVisibility(undefined, undefined)).toBe('off');
  });

  it('maps legacy booleans without overriding an explicit value', () => {
    expect(resolveTalentDirectoryVisibility(null, true)).toBe('public');
    expect(resolveTalentDirectoryVisibility(null, false)).toBe('off');
    expect(resolveTalentDirectoryVisibility('employers_only', false)).toBe(
      'employers_only',
    );
  });
});
