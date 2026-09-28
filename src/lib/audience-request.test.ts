import { createBoardClient, type BoardRequest } from '@cavuno/board';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { audienceCookieName, SESSION_MS } from './audience-attribution';
import { applyAudienceAttribution } from './audience-request';

const evidence = { channel: 'email', campaign: '["launch","mail","email"]' };
const cookie = (board: string) =>
  `${audienceCookieName(board)}=${encodeURIComponent(JSON.stringify({ expiresAt: Date.now() + SESSION_MS, attribution: evidence }))}`;
const request = (route: string, method = 'POST'): BoardRequest => ({
  url: `https://api.example/custom/v1/boards/pk_board/${route}`,
  init: {
    method,
    headers: new Headers(),
    body: JSON.stringify({ email: 'person@example.test' }),
  },
});
afterEach(() => vi.unstubAllGlobals());

describe('audience request forwarding', () => {
  it('uses valid edge country only alongside consented capture', () => {
    const req = request('auth/register');
    applyAudienceAttribution(
      req,
      () => cookie('pk_board'),
      () => 'GB',
    );
    expect(JSON.parse(String(req.init.body)).audienceAttribution).toEqual({
      ...evidence,
      location: 'GB',
    });
    for (const country of ['XX', 'T1', '', 'invalid']) {
      const unknown = request('auth/register');
      applyAudienceAttribution(
        unknown,
        () => cookie('pk_board'),
        () => country,
      );
      expect(JSON.parse(String(unknown.init.body)).audienceAttribution).toEqual(
        evidence,
      );
    }
    const absent = request('auth/register');
    applyAudienceAttribution(
      absent,
      () => '',
      () => 'GB',
    );
    expect(JSON.parse(String(absent.init.body))).not.toHaveProperty(
      'audienceAttribution',
    );
  });
  it.each([
    'auth/register',
    'auth/magic-link',
    'job-alerts',
    'me/alerts',
    'me/notification-preferences',
  ])('forwards evidence to %s', (route) => {
    const req = request(
      route,
      route === 'me/notification-preferences' ? 'PUT' : 'POST',
    );
    applyAudienceAttribution(req, () => cookie('pk_board'));
    expect(JSON.parse(String(req.init.body))).toEqual({
      email: 'person@example.test',
      audienceAttribution: evidence,
    });
  });
  it.each([
    'auth/login',
    'auth/verify-email',
    'auth/magic-link/verify',
    'auth/oauth/exchange',
    'auth/refresh',
    'me/alerts/id',
    'me/notification-preferences/unsubscribe',
  ])('does not enrich %s', (route) => {
    const req = request(route);
    applyAudienceAttribution(req, () => cookie('pk_board'));
    expect(JSON.parse(String(req.init.body))).not.toHaveProperty(
      'audienceAttribution',
    );
  });
  it.each(['google', 'linkedin'])(
    'forwards OAuth %s evidence as JSON query',
    (provider) => {
      const req = request(`auth/oauth/${provider}`, 'GET');
      applyAudienceAttribution(req, () => cookie('pk_board'));
      expect(
        JSON.parse(new URL(req.url).searchParams.get('audienceAttribution')!),
      ).toEqual(evidence);
    },
  );
  it('rejects denied consent, invalid cookies, and other boards', () => {
    for (const header of [
      cookie('pk_other'),
      `${cookie('pk_board')}; cavuno_cookie_consent=denied`,
      'cavuno_audience_pk_board=%broken',
      'cavuno_cookie_consent=%broken',
    ]) {
      const req = request('auth/register');
      applyAudienceAttribution(req, () => header);
      expect(JSON.parse(String(req.init.body))).not.toHaveProperty(
        'audienceAttribution',
      );
    }
  });
  it('uses incoming request cookies on each actual SDK call, retaining headers and board identifiers', async () => {
    let incoming = cookie('pk_ board');
    const fetch = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetch);
    const board = createBoardClient({
      baseUrl: 'https://api.example/custom',
      board: 'pk_ board',
      onRequest: (req) => applyAudienceAttribution(req, () => incoming),
    });
    await board.client.fetch('/auth/register', {
      method: 'POST',
      body: { email: 'a@example.test' },
      headers: { authorization: 'Bearer original' },
    });
    expect(JSON.parse(String(fetch.mock.calls[0][1].body))).toHaveProperty(
      'audienceAttribution',
      evidence,
    );
    expect(
      new Headers(fetch.mock.calls[0][1].headers).get('authorization'),
    ).toBe('Bearer original');
    incoming = '';
    await board.client.fetch('/auth/register', {
      method: 'POST',
      body: { email: 'b@example.test' },
    });
    expect(JSON.parse(String(fetch.mock.calls[1][1].body))).not.toHaveProperty(
      'audienceAttribution',
    );
  });
});
