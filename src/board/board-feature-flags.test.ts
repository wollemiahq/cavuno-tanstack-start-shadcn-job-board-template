import { describe, expect, it } from 'vitest';

import {
  failClosedJobRecommendations,
  type RuntimeBoardFeatureFlags,
  resolveRuntimeFeatureFlags,
  resolveTalentDirectoryVisibility,
} from './board-feature-flags';

/**
 * The runtime flags (Board PR #968) ride the board context ahead of the
 * pinned SDK's types. Job recommendations preserve shipped behavior when
 * absent; Recommended talent and place suggestions remain opt-in and
 * therefore default off.
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
    contactPage: true,
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
    Reflect.deleteProperty(legacyFeatures, 'placeSuggestions');
    expect(resolveRuntimeFeatureFlags(legacyFeatures)).toEqual({
      nativeApplications: true,
      messaging: true,
      jobRecommendationsEnabled: true,
      recommendedTalentEnabled: false,
      placeSuggestions: false,
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
          placeSuggestions: false,
        }),
      ),
    ).toEqual({
      nativeApplications: false,
      messaging: false,
      jobRecommendationsEnabled: false,
      recommendedTalentEnabled: false,
      placeSuggestions: false,
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
          placeSuggestions: true,
        }),
      ),
    ).toEqual({
      nativeApplications: true,
      messaging: true,
      jobRecommendationsEnabled: true,
      recommendedTalentEnabled: true,
      placeSuggestions: true,
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
          placeSuggestions: true,
        }),
      ),
    ).toEqual({
      nativeApplications: false,
      messaging: true,
      jobRecommendationsEnabled: false,
      recommendedTalentEnabled: true,
      placeSuggestions: true,
    });
  });
});

describe('failClosedJobRecommendations', () => {
  it('preserves unrelated board features while disabling recommendations', () => {
    expect(
      failClosedJobRecommendations({
        jobRecommendationsEnabled: true,
        messaging: true,
        employers: true,
      }),
    ).toEqual({
      jobRecommendationsEnabled: false,
      messaging: true,
      employers: true,
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

  it('hides the directory when either signal is off', () => {
    expect(resolveTalentDirectoryVisibility('off', true)).toBe('off');
    expect(resolveTalentDirectoryVisibility(true, 'off')).toBe('off');
  });
});
