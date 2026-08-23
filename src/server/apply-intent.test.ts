import { describe, expect, it, vi } from 'vitest';

import {
  APPLY_SESSION_COOKIE,
  applyJobSlug,
  applySessionKey,
  createApplyIntent,
  gatewayRedirect,
  isSameOriginApplyRequest,
  ordinaryFallbackRedirect,
  withApplyCookies,
} from './apply-intent';

describe('board-local Apply intent seam', () => {
  it('accepts exactly one job slug from the posted form', async () => {
    const request = new Request('https://board.example/apply', {
      method: 'POST',
      body: new URLSearchParams({ jobSlug: 'senior-engineer' }),
    });
    expect(await applyJobSlug(request)).toBe('senior-engineer');
  });

  it('rejects destination, profile, and browser session fields instead of silently accepting them', async () => {
    for (const extra of ['destination', 'countryCode', 'sessionKey']) {
      const request = new Request('https://board.example/apply', {
        method: 'POST',
        body: new URLSearchParams({
          jobSlug: 'senior-engineer',
          [extra]: 'x',
        }),
      });
      expect(await applyJobSlug(request)).toBeNull();
    }
  });

  it('fails closed for missing or cross-site POST provenance', () => {
    const sameOrigin = new Request('https://board.example/apply', {
      method: 'POST',
      headers: { origin: 'https://board.example' },
    });
    expect(isSameOriginApplyRequest(sameOrigin)).toBe(true);
    expect(
      isSameOriginApplyRequest(
        new Request('https://board.example/apply', {
          method: 'POST',
          headers: { origin: 'https://attacker.example' },
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginApplyRequest(
        new Request('https://board.example/apply', { method: 'POST' }),
      ),
    ).toBe(false);
  });

  it('rejects a missing job slug before an intent can be created', async () => {
    expect(
      await applyJobSlug(
        new Request('https://board.example/apply', {
          method: 'POST',
          body: new URLSearchParams({
            destination: 'https://attacker.example',
          }),
        }),
      ),
    ).toBeNull();
  });

  it('rejects malformed non-form bodies as a client error', async () => {
    await expect(
      applyJobSlug(
        new Request('https://board.example/apply', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{not-json-or-form',
        }),
      ),
    ).resolves.toBeNull();
  });

  it('reuses a host-only opaque duplicate key and never takes one from FormData', () => {
    const key = 'A'.repeat(32);
    expect(applySessionKey(`${APPLY_SESSION_COOKIE}=${key}`)).toEqual({
      sessionKey: key,
      setCookie: null,
    });

    const created = applySessionKey(null, () => 'B'.repeat(32));
    expect(created.sessionKey).toBe('B'.repeat(32));
    expect(created.setCookie).toContain(`${APPLY_SESSION_COOKIE}=`);
    expect(created.setCookie).toContain('HttpOnly');
    expect(created.setCookie).toContain('Secure');
  });

  it('calls the versioned intent endpoint with only the server-owned session key', async () => {
    const fetch = vi.fn().mockResolvedValue({
      id: 'intent_1234567890',
      object: 'apply_intent',
      gatewayUrl: 'https://apply.cavuno.com/a/intent_1234567890',
      expiresAt: '2026-08-23T00:00:00.000Z',
    });
    await createApplyIntent(
      { fetch } as never,
      'senior engineer/au',
      'S'.repeat(32),
      { authorization: 'Bearer trusted' },
    );
    expect(fetch).toHaveBeenCalledWith(
      '/jobs/senior%20engineer%2Fau/apply-intents',
      {
        method: 'POST',
        headers: { authorization: 'Bearer trusted' },
        body: { sessionKey: 'S'.repeat(32) },
      },
    );
  });

  it('turns a successful 201 intent into a temporary, non-indexable 303', () => {
    const response = gatewayRedirect(
      {
        id: 'intent_12345678901234567890',
        object: 'apply_intent',
        gatewayUrl: 'https://apply.cavuno.com/a/intent_12345678901234567890',
        expiresAt: '2099-08-23T00:00:00.000Z',
      },
      null,
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'https://apply.cavuno.com/a/intent_12345678901234567890',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('refuses a malformed gateway URL rather than becoming an open redirect', () => {
    expect(() =>
      gatewayRedirect(
        {
          id: 'intent_12345678901234567890',
          object: 'apply_intent',
          gatewayUrl: 'https://attacker.example/a/intent_12345678901234567890',
          expiresAt: '2099-08-23T00:00:00.000Z',
        },
        null,
      ),
    ).toThrow('Invalid Apply gateway URL');
  });

  it.each([
    {
      id: 'intent_12345678901234567890',
      gatewayUrl: 'https://apply.cavuno.com:444/a/intent_12345678901234567890',
      expiresAt: '2099-08-23T00:00:00.000Z',
    },
    {
      id: 'intent_12345678901234567890',
      gatewayUrl:
        'https://apply.cavuno.com/a/intent_12345678901234567890?destination=evil',
      expiresAt: '2099-08-23T00:00:00.000Z',
    },
    {
      id: 'intent_12345678901234567890',
      gatewayUrl: 'https://apply.cavuno.com/a/different_opaque_token',
      expiresAt: '2099-08-23T00:00:00.000Z',
    },
    {
      id: 'intent_12345678901234567890',
      gatewayUrl: 'https://apply.cavuno.com/a/intent_12345678901234567890',
      expiresAt: '2020-08-23T00:00:00.000Z',
    },
  ])('rejects a non-canonical or expired gateway intent', (intent) => {
    expect(() =>
      gatewayRedirect({ object: 'apply_intent', ...intent }, null),
    ).toThrow();
  });

  it('preserves both a rotated session and a new host-only Apply session cookie', () => {
    const response = withApplyCookies(new Response(null), [
      '__Host-cavuno_board_session=rotated; Path=/; Secure; HttpOnly',
      '__Host-cavuno_apply_session=duplicate; Path=/; Secure; HttpOnly',
    ]);
    const cookies = response.headers.get('set-cookie') ?? '';
    expect(cookies).toContain('__Host-cavuno_board_session=rotated');
    expect(cookies).toContain('__Host-cavuno_apply_session=duplicate');
  });
});

describe('ordinary all_jobs degraded Apply', () => {
  const ordinary = {
    isSponsored: false,
    applicationUrl: 'https://jobs.example/apply/123',
    applyAction: 'gateway_external',
  } as const;

  it('releases only a fresh trusted ordinary HTTPS URL after intent failure', () => {
    const response = ordinaryFallbackRedirect(ordinary);
    expect(response?.status).toBe(303);
    expect(response?.headers.get('location')).toBe(ordinary.applicationUrl);
  });

  it.each([
    { ...ordinary, isSponsored: true },
    { ...ordinary, isSponsored: undefined },
    { ...ordinary, applyAction: 'external_direct' },
    { ...ordinary, applicationUrl: 'javascript:alert(1)' },
    { ...ordinary, applicationUrl: 'http://jobs.example/apply/123' },
  ])(
    'never falls back for Sponsored, unknown, direct, or unsafe jobs',
    (job) => {
      expect(ordinaryFallbackRedirect(job)).toBeNull();
    },
  );
});
