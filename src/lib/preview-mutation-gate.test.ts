import { describe, expect, it } from 'vitest';

import { rejectSharedDemoMutation } from './preview';

/**
 * F1 — server-side private gate for updateSandboxFlags + reseedSandbox.
 * Both handlers call `rejectSharedDemoMutation` after capability.canPreview
 * so a crafted RPC cannot reseed / flag-toggle a shared public fixture.
 * Legacy sandbox-on-primary (no demo key) must stay allowed.
 */
describe('rejectSharedDemoMutation (F1 — updateSandboxFlags + reseedSandbox)', () => {
  it('demo key configured, PRIVATE unset, canPreview=true → both handlers reject (not-private)', () => {
    // Capability already passed; this is the second gate only.
    const result = rejectSharedDemoMutation({
      demoConfigured: true,
      demoBoardPrivate: false,
    });
    expect(result).toEqual({
      ok: false,
      code: 'not-private',
      message: expect.stringMatching(/private/i),
    });
  });

  it('demo key configured, PRIVATE=1 → mutation allowed', () => {
    expect(
      rejectSharedDemoMutation({
        demoConfigured: true,
        demoBoardPrivate: true,
      }),
    ).toBeNull();
  });

  it('no demo key → allowed (legacy sandbox-on-primary)', () => {
    expect(
      rejectSharedDemoMutation({
        demoConfigured: false,
        demoBoardPrivate: false,
      }),
    ).toBeNull();
    expect(
      rejectSharedDemoMutation({
        demoConfigured: false,
        demoBoardPrivate: true,
      }),
    ).toBeNull();
  });
});
