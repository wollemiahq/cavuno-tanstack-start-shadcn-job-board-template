import { describe, expect, it } from 'vitest';

import {
  clampEmailLimit,
  groupPersonasByRole,
  pickWhitelistedConfig,
  PREVIEW_EMAILS_DEFAULT_LIMIT,
  PREVIEW_EMAILS_MAX_LIMIT,
  PREVIEW_FEATURE_FLAGS,
  SANDBOX_CONFIG_WHITELIST,
  TALENT_DIRECTORY_VISIBILITIES,
  toPreviewBoardConfig,
  projectPersona,
  resolveCapability,
  type RawPreviewPersona,
} from './preview';

/**
 * Literal mirror of the platform's sandbox config whitelist — keep in sync with
 * `convex/boards/sandboxPersonaManifest.ts`, the source of truth for which
 * board-config keys `PATCH /sandbox/config` accepts and their value types. This
 * copy is what pins the template's outgoing vocabulary against the platform so
 * the two can only drift loudly (a failing test), never silently (a 400 at
 * runtime). `passwordProtectionEnabled` is intentionally absent — it is being
 * removed from the platform whitelist concurrently.
 */
const PLATFORM_SANDBOX_CONFIG_WHITELIST = {
  jobAccessPaywallEnabled: 'boolean',
  jobAccessPreviewCount: 'number',
  talentDirectoryVisibility: 'enum',
  blogEnabled: 'boolean',
  jobAlertsEnabled: 'boolean',
  candidatesEnabled: 'boolean',
  employersEnabled: 'boolean',
  registrationWallEnabled: 'boolean',
} as const;

/** Whitelist keys the toolbar intentionally does NOT surface as a control. */
const UI_OMITTED_KEYS = ['jobAccessPreviewCount'] as const;

describe('resolveCapability', () => {
  it('is capable with reason "sandbox" on a sandbox board', () => {
    expect(resolveCapability({ sandbox: true })).toEqual({
      canPreview: true,
      reason: 'sandbox',
    });
  });

  it('is NOT capable with reason "not-sandbox" on a tenant board', () => {
    expect(resolveCapability({ sandbox: false })).toEqual({
      canPreview: false,
      reason: 'not-sandbox',
    });
  });
});

describe('projectPersona', () => {
  const raw: RawPreviewPersona = {
    id: 'candidate-complete',
    role: 'candidate',
    displayName: 'Casey Complete',
    description: 'Full profile, applications, saved jobs',
    states: ['application-tracker', 'saved-jobs'],
    email: 'candidate-complete@sandbox.cavuno.com',
  };

  it('strips email (and never carries a password) before the browser', () => {
    const projected = projectPersona(raw);
    expect(projected).toEqual({
      id: 'candidate-complete',
      role: 'candidate',
      displayName: 'Casey Complete',
      description: 'Full profile, applications, saved jobs',
      states: ['application-tracker', 'saved-jobs'],
    });
    expect('email' in projected).toBe(false);
  });
});

describe('pickWhitelistedConfig', () => {
  it('keeps whitelisted board-config keys and drops everything else', () => {
    const result = pickWhitelistedConfig({
      jobAccessPaywallEnabled: true,
      blogEnabled: false,
      talentDirectoryVisibility: 'employers_only',
      // reserved / public-name / removed keys must all be dropped
      candidatePaywall: true, // public features-map name — not a config key
      sandboxBoard: true,
      isTestBoard: true,
      passwordProtectionEnabled: true, // removed from the platform whitelist
    });
    expect(result).toEqual({
      jobAccessPaywallEnabled: true,
      blogEnabled: false,
      talentDirectoryVisibility: 'employers_only',
    });
  });

  it('returns an empty object when nothing is whitelisted', () => {
    expect(pickWhitelistedConfig({ candidatePaywall: true })).toEqual({});
  });

  it('every whitelisted config key round-trips with its value intact', () => {
    const all = {
      jobAccessPaywallEnabled: true,
      jobAccessPreviewCount: 3,
      talentDirectoryVisibility: 'public',
      blogEnabled: true,
      jobAlertsEnabled: false,
      candidatesEnabled: true,
      employersEnabled: false,
      registrationWallEnabled: true,
    };
    expect(pickWhitelistedConfig(all)).toEqual(all);
  });
});

describe('sandbox config whitelist ⇄ platform contract', () => {
  it('SANDBOX_CONFIG_WHITELIST matches the platform whitelist keys exactly', () => {
    expect([...SANDBOX_CONFIG_WHITELIST].sort()).toEqual(
      Object.keys(PLATFORM_SANDBOX_CONFIG_WHITELIST).sort(),
    );
  });

  it('drops passwordProtectionEnabled — it is off the platform whitelist', () => {
    expect(SANDBOX_CONFIG_WHITELIST.has('passwordProtectionEnabled')).toBe(
      false,
    );
  });

  it('every UI flag key is a platform whitelist key with a matching value type', () => {
    for (const flag of PREVIEW_FEATURE_FLAGS) {
      const platformType = (
        PLATFORM_SANDBOX_CONFIG_WHITELIST as Record<string, string>
      )[flag.key];
      expect(platformType, `unknown config key: ${flag.key}`).toBeDefined();
      // The control kind maps 1:1 onto the platform value type.
      const expectedKind = platformType === 'enum' ? 'enum' : 'boolean';
      expect(flag.kind, `wrong control for ${flag.key}`).toBe(expectedKind);
    }
  });

  it('surfaces every whitelist key as a control except the documented omissions', () => {
    const surfaced = PREVIEW_FEATURE_FLAGS.map((flag) => flag.key).sort();
    const expected = Object.keys(PLATFORM_SANDBOX_CONFIG_WHITELIST)
      .filter((key) => !UI_OMITTED_KEYS.includes(key as never))
      .sort();
    expect(surfaced).toEqual(expected);
  });

  it('the talentDirectoryVisibility control maps directly to the enum members', () => {
    const enumFlag = PREVIEW_FEATURE_FLAGS.find(
      (flag) => flag.kind === 'enum',
    );
    expect(enumFlag?.key).toBe('talentDirectoryVisibility');
    expect(enumFlag?.kind === 'enum' ? enumFlag.options : []).toEqual([
      'off',
      'public',
      'employers_only',
    ]);
    expect(TALENT_DIRECTORY_VISIBILITIES).toEqual([
      'off',
      'public',
      'employers_only',
    ]);
  });
});

describe('toPreviewBoardConfig', () => {
  it('projects the public board context onto the write-side config keys', () => {
    const config = toPreviewBoardConfig({
      features: {
        candidatePaywall: true,
        blog: false,
        jobAlerts: true,
        candidates: false,
        employers: true,
        registrationWall: false,
      },
      talentDirectoryVisibility: 'employers_only',
    });
    expect(config).toEqual({
      jobAccessPaywallEnabled: true,
      talentDirectoryVisibility: 'employers_only',
      blogEnabled: false,
      jobAlertsEnabled: true,
      candidatesEnabled: false,
      employersEnabled: true,
      registrationWallEnabled: false,
    });
  });

  it('defaults a null talent visibility to "off"', () => {
    const config = toPreviewBoardConfig({
      features: {
        candidatePaywall: false,
        blog: false,
        jobAlerts: false,
        candidates: false,
        employers: false,
        registrationWall: false,
      },
      talentDirectoryVisibility: null,
    });
    expect(config.talentDirectoryVisibility).toBe('off');
  });
});

describe('clampEmailLimit', () => {
  it('defaults to 50 when no limit is given', () => {
    expect(clampEmailLimit()).toBe(PREVIEW_EMAILS_DEFAULT_LIMIT);
    expect(clampEmailLimit(undefined)).toBe(PREVIEW_EMAILS_DEFAULT_LIMIT);
  });

  it('caps the limit at 200', () => {
    expect(clampEmailLimit(9999)).toBe(PREVIEW_EMAILS_MAX_LIMIT);
  });

  it('floors the limit at 1 and truncates fractions', () => {
    expect(clampEmailLimit(0)).toBe(1);
    expect(clampEmailLimit(-5)).toBe(1);
    expect(clampEmailLimit(12.9)).toBe(12);
  });

  it('falls back to the default for non-finite input', () => {
    expect(clampEmailLimit(Number.NaN)).toBe(PREVIEW_EMAILS_DEFAULT_LIMIT);
    expect(clampEmailLimit(Number.POSITIVE_INFINITY)).toBe(
      PREVIEW_EMAILS_DEFAULT_LIMIT,
    );
  });
});

describe('groupPersonasByRole', () => {
  it('partitions personas into candidate and employer buckets', () => {
    const grouped = groupPersonasByRole([
      {
        id: 'c1',
        role: 'candidate',
        displayName: 'C1',
        description: '',
        states: [],
      },
      {
        id: 'e1',
        role: 'employer',
        displayName: 'E1',
        description: '',
        states: [],
      },
      {
        id: 'c2',
        role: 'candidate',
        displayName: 'C2',
        description: '',
        states: [],
      },
    ]);
    expect(grouped.candidate.map((p) => p.id)).toEqual(['c1', 'c2']);
    expect(grouped.employer.map((p) => p.id)).toEqual(['e1']);
  });
});
