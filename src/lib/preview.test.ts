import { describe, expect, it } from 'vitest';

import {
  activePersonaIdForViewer,
  clampEmailLimit,
  groupPersonasByRole,
  pickWhitelistedConfig,
  PREVIEW_EMAILS_DEFAULT_LIMIT,
  PREVIEW_EMAILS_MAX_LIMIT,
  PREVIEW_FEATURE_FLAGS,
  rewriteEmailHtmlLinks,
  rewriteEmailTextLinks,
  rewritePreviewEmailLinks,
  SANDBOX_CONFIG_WHITELIST,
  TALENT_DIRECTORY_VISIBILITIES,
  toOrigin,
  toPreviewBoardConfig,
  projectPersona,
  resolveCapability,
  type PreviewEmail,
  type RawPreviewPersona,
  type SandboxConfigPatch,
  unmetFlagRequirements,
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
  jobRecommendationsEnabled: 'boolean',
  candidatesEnabled: 'boolean',
  employersEnabled: 'boolean',
  nativeApplicationsEnabled: 'boolean',
  applicantMessagingEnabled: 'boolean',
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

  it('resolves a stable active id server-side without projecting email', () => {
    expect(
      activePersonaIdForViewer(
        [raw],
        ' CANDIDATE-COMPLETE@SANDBOX.CAVUNO.COM ',
      ),
    ).toBe('candidate-complete');
    expect(activePersonaIdForViewer([raw], 'someone-else@example.com')).toBe(
      null,
    );
  });
});

describe('pickWhitelistedConfig', () => {
  it('keeps whitelisted board-config keys and drops everything else', () => {
    const untrustedConfig = {
      jobAccessPaywallEnabled: true,
      blogEnabled: false,
      talentDirectoryVisibility: 'employers_only',
      // reserved / public-name / removed keys must all be dropped
      candidatePaywall: true, // public features-map name — not a config key
      sandboxBoard: true,
      isTestBoard: true,
      passwordProtectionEnabled: true, // removed from the platform whitelist
    } satisfies SandboxConfigPatch & {
      candidatePaywall: boolean;
      sandboxBoard: boolean;
      isTestBoard: boolean;
      passwordProtectionEnabled: boolean;
    };
    const result = pickWhitelistedConfig(untrustedConfig);
    expect(result).toEqual({
      jobAccessPaywallEnabled: true,
      blogEnabled: false,
      talentDirectoryVisibility: 'employers_only',
    });
  });

  it('returns an empty object when nothing is whitelisted', () => {
    const untrustedConfig = {
      candidatePaywall: true,
      jobAccessPaywallEnabled: undefined,
    } satisfies { candidatePaywall: boolean } & SandboxConfigPatch;
    expect(pickWhitelistedConfig(untrustedConfig)).toEqual({});
  });

  it('every whitelisted config key round-trips with its value intact', () => {
    const all = {
      jobAccessPaywallEnabled: true,
      jobAccessPreviewCount: 3,
      talentDirectoryVisibility: 'public',
      blogEnabled: true,
      jobAlertsEnabled: false,
      jobRecommendationsEnabled: true,
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
      const platformType = PLATFORM_SANDBOX_CONFIG_WHITELIST[flag.key];
      expect(platformType, `unknown config key: ${flag.key}`).toBeDefined();
      // The control kind maps 1:1 onto the platform value type.
      const expectedKind = platformType === 'enum' ? 'enum' : 'boolean';
      expect(flag.kind, `wrong control for ${flag.key}`).toBe(expectedKind);
    }
  });

  it('surfaces every whitelist key as a control except the documented omissions', () => {
    const surfaced = PREVIEW_FEATURE_FLAGS.map((flag) => flag.key).sort();
    const omitted = new Set<string>(UI_OMITTED_KEYS);
    const expected = Object.keys(PLATFORM_SANDBOX_CONFIG_WHITELIST)
      .filter((key) => !omitted.has(key))
      .sort();
    expect(surfaced).toEqual(expected);
  });

  it('the talentDirectoryVisibility control maps directly to the enum members', () => {
    const enumFlag = PREVIEW_FEATURE_FLAGS.find((flag) => flag.kind === 'enum');
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
        jobRecommendationsEnabled: false,
        candidates: false,
        employers: true,
        registrationWall: false,
        nativeApplications: false,
        messaging: true,
      },
      talentDirectoryVisibility: 'employers_only',
    });
    expect(config).toEqual({
      jobAccessPaywallEnabled: true,
      talentDirectoryVisibility: 'employers_only',
      blogEnabled: false,
      jobAlertsEnabled: true,
      jobRecommendationsEnabled: false,
      candidatesEnabled: false,
      employersEnabled: true,
      nativeApplicationsEnabled: false,
      applicantMessagingEnabled: true,
      registrationWallEnabled: false,
    });
  });

  it('defaults the untyped runtime flags to ON when the API omits them', () => {
    const config = toPreviewBoardConfig({
      features: {
        candidatePaywall: false,
        blog: true,
        jobAlerts: true,
        candidates: true,
        employers: true,
        registrationWall: false,
      },
      talentDirectoryVisibility: null,
    });
    expect(config.nativeApplicationsEnabled).toBe(true);
    expect(config.applicantMessagingEnabled).toBe(true);
    expect(config.jobRecommendationsEnabled).toBe(true);
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

describe('unmetFlagRequirements (dependency gating)', () => {
  const baseConfig = {
    jobAccessPaywallEnabled: false,
    talentDirectoryVisibility: 'public',
    blogEnabled: true,
    jobAlertsEnabled: true,
    jobRecommendationsEnabled: true,
    candidatesEnabled: true,
    employersEnabled: true,
    nativeApplicationsEnabled: true,
    applicantMessagingEnabled: true,
    registrationWallEnabled: false,
  } as const;
  const flag = (key: string) =>
    PREVIEW_FEATURE_FLAGS.find((entry) => entry.key === key)!;

  it('every requires entry is a whitelisted boolean parent key', () => {
    for (const entry of PREVIEW_FEATURE_FLAGS) {
      if (entry.kind !== 'boolean' || !entry.requires) continue;
      for (const parent of entry.requires) {
        expect(SANDBOX_CONFIG_WHITELIST.has(parent)).toBe(true);
      }
      expect(entry.requiresNote).toBeTruthy();
    }
  });

  it('ATS is gated when employers are off; messaging when either parent is off', () => {
    expect(
      unmetFlagRequirements(flag('nativeApplicationsEnabled'), {
        ...baseConfig,
        employersEnabled: false,
      }),
    ).toEqual(['employersEnabled']);
    expect(
      unmetFlagRequirements(flag('applicantMessagingEnabled'), {
        ...baseConfig,
        candidatesEnabled: false,
      }),
    ).toEqual(['candidatesEnabled']);
    expect(
      unmetFlagRequirements(flag('applicantMessagingEnabled'), {
        ...baseConfig,
        employersEnabled: false,
        candidatesEnabled: false,
      }),
    ).toEqual(['employersEnabled', 'candidatesEnabled']);
  });

  it('is empty when parents are on, and for dependency-free flags', () => {
    expect(
      unmetFlagRequirements(flag('nativeApplicationsEnabled'), baseConfig),
    ).toEqual([]);
    expect(unmetFlagRequirements(flag('blogEnabled'), baseConfig)).toEqual([]);
    expect(
      unmetFlagRequirements(flag('talentDirectoryVisibility'), {
        ...baseConfig,
        employersEnabled: false,
      }),
    ).toEqual([]);
  });
});

describe('toOrigin', () => {
  it('normalizes an absolute URL to protocol + host + port', () => {
    expect(toOrigin('https://sandbox.cavuno.com/auth/verify?token=abc')).toBe(
      'https://sandbox.cavuno.com',
    );
    // The current-origin computation the server fn feeds from the request URL:
    // an IPv6 dev origin with an explicit port is preserved.
    expect(toOrigin('http://[::1]:3030/preview/emails')).toBe(
      'http://[::1]:3030',
    );
  });

  it('returns null for a non-absolute / unparseable URL', () => {
    expect(toOrigin('/auth/verify?token=abc')).toBeNull();
    expect(toOrigin('not a url')).toBeNull();
  });
});

describe('rewriteEmailHtmlLinks', () => {
  const origins = {
    boardOrigin: 'https://sandbox.cavuno.com',
    appOrigin: 'http://[::1]:3030',
  };

  it('rewrites a board-origin href to the app origin, preserving path/query/hash', () => {
    const html =
      '<p>Click <a href="https://sandbox.cavuno.com/auth/verify-email?token=a%2Bb&amp;x=1#done">here</a>.</p>';
    expect(rewriteEmailHtmlLinks(html, origins)).toBe(
      '<p>Click <a href="http://[::1]:3030/auth/verify-email?token=a%2Bb&amp;x=1#done" target="_top">here</a>.</p>',
    );
  });

  it('leaves external links and relative links untouched', () => {
    const html =
      '<a href="https://unsubscribe.mailer.com/u/9">out</a>' +
      '<a href="/local/path?x=1">rel</a>' +
      '<a href="mailto:hi@cavuno.com">mail</a>';
    expect(rewriteEmailHtmlLinks(html, origins)).toBe(html);
  });

  it('handles single-quoted hrefs and multiple links in one body', () => {
    const html =
      "<a href='https://sandbox.cavuno.com/a'>a</a>" +
      '<a href="https://sandbox.cavuno.com/b?q=2">b</a>';
    expect(rewriteEmailHtmlLinks(html, origins)).toBe(
      '<a href=\'http://[::1]:3030/a\' target="_top">a</a>' +
        '<a href="http://[::1]:3030/b?q=2" target="_top">b</a>',
    );
  });

  it('targets same-origin completion links at the top-level app', () => {
    const same = {
      boardOrigin: 'https://sandbox.cavuno.com',
      appOrigin: 'https://sandbox.cavuno.com',
    };
    const html = '<a href="https://sandbox.cavuno.com/a">a</a>';
    expect(rewriteEmailHtmlLinks(html, same)).toBe(
      '<a href="https://sandbox.cavuno.com/a" target="_top">a</a>',
    );
  });

  it('replaces an existing completion-link target without touching external links', () => {
    const html =
      '<a target="_blank" href="https://sandbox.cavuno.com/a">local</a>' +
      '<a target="_blank" href="https://example.com/a">external</a>';
    expect(rewriteEmailHtmlLinks(html, origins)).toBe(
      '<a href="http://[::1]:3030/a" target="_top">local</a>' +
        '<a target="_blank" href="https://example.com/a">external</a>',
    );
  });
});

describe('rewriteEmailTextLinks', () => {
  const origins = {
    boardOrigin: 'https://sandbox.cavuno.com',
    appOrigin: 'http://[::1]:3030',
  };

  it('rewrites a board-origin URL boundary, preserving the rest', () => {
    expect(
      rewriteEmailTextLinks(
        'Verify: https://sandbox.cavuno.com/auth/verify?token=def now',
        origins,
      ),
    ).toBe('Verify: http://[::1]:3030/auth/verify?token=def now');
  });

  it('does not match a longer look-alike host', () => {
    const text = 'Beware https://sandbox.cavuno.com.evil.test/phish';
    expect(rewriteEmailTextLinks(text, origins)).toBe(text);
  });
});

describe('rewritePreviewEmailLinks', () => {
  const origins = {
    boardOrigin: 'https://sandbox.cavuno.com',
    appOrigin: 'http://[::1]:3030',
  };

  it('rewrites both the HTML body and the plain-text fallback', () => {
    const email: PreviewEmail = {
      id: 'email-verify',
      to: 'adam@example.com',
      subject: 'Verify your email address',
      html: '<a href="https://sandbox.cavuno.com/auth/verify?token=t">verify</a>',
      text: 'Open https://sandbox.cavuno.com/auth/verify?token=t',
      type: 'verification',
      createdAt: 0,
    };
    const out = rewritePreviewEmailLinks(email, origins);
    expect(out.html).toContain('href="http://[::1]:3030/auth/verify?token=t"');
    expect(out.text).toBe('Open http://[::1]:3030/auth/verify?token=t');
    // Metadata is never touched.
    expect(out.subject).toBe(email.subject);
    expect(out.to).toBe(email.to);
  });

  it('leaves a null text body null', () => {
    const email: PreviewEmail = {
      id: 'e',
      to: 'x@example.com',
      subject: 's',
      html: '<a href="https://sandbox.cavuno.com/x">x</a>',
      text: null,
      type: null,
      createdAt: 0,
    };
    expect(rewritePreviewEmailLinks(email, origins).text).toBeNull();
  });
});
