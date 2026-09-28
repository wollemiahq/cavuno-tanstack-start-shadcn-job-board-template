// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  audienceCookieName,
  captureBrowserAudienceAttribution,
  clearBrowserAudienceAttribution,
  normalizeAudienceAttribution,
  parseAudienceCookie,
  readAudienceCookie,
  SESSION_MS,
} from './audience-attribution';

afterEach(() => {
  clearBrowserAudienceAttribution('pk_board');
  vi.useRealTimers();
});
describe('first-touch audience snapshots', () => {
  it('normalizes UTM campaign, referrer, and device evidence', () => {
    expect(
      normalizeAudienceAttribution(
        'https://board.test/?utm_medium=email&utm_source=mail&utm_campaign=launch',
        'https://www.google.com/search?private=query',
        'Mozilla Windows Chrome',
      ),
    ).toEqual({
      channel: 'email',
      source: 'google.com',
      campaign: '["launch","mail","email"]',
      browser: 'chrome',
      os: 'windows',
      device: 'desktop',
    });
    expect(
      normalizeAudienceAttribution(
        'https://board.test/',
        'https://board.test/jobs',
        '',
      ).channel,
    ).toBe('direct');
  });
  it('preserves first touch and the original expiry across later captures', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T00:00:00Z'));
    captureBrowserAudienceAttribution('pk_board', {
      href: 'https://board.test/?utm_medium=email',
      referrer: '',
    });
    const initial = document.cookie;
    vi.advanceTimersByTime(60_000);
    captureBrowserAudienceAttribution('pk_board', {
      href: 'https://board.test/?utm_medium=cpc',
      referrer: '',
    });
    expect(document.cookie).toBe(initial);
    expect(readAudienceCookie(document.cookie, 'pk_board')?.channel).toBe(
      'email',
    );
    vi.advanceTimersByTime(SESSION_MS);
    expect(readAudienceCookie(document.cookie, 'pk_board')).toBeUndefined();
    captureBrowserAudienceAttribution('pk_board', {
      href: 'https://board.test/?utm_medium=cpc',
      referrer: '',
    });
    expect(readAudienceCookie(document.cookie, 'pk_board')?.channel).toBe(
      'paid_search',
    );
  });
  it('rejects expired, oversized, and malformed snapshots', () => {
    const now = Date.now();
    const encode = (value: {
      expiresAt: number;
      attribution: { channel?: string; source?: string };
    }) => encodeURIComponent(JSON.stringify(value));
    for (const value of [
      encode({ expiresAt: now - 1, attribution: { channel: 'direct' } }),
      encode({
        expiresAt: now + SESSION_MS + 10_000,
        attribution: { channel: 'direct' },
      }),
      encode({
        expiresAt: now + 1000,
        attribution: { source: 'a'.repeat(701) },
      }),
      '%broken',
      'a'.repeat(4097),
    ])
      expect(parseAudienceCookie(value, now)).toBeUndefined();
    expect(audienceCookieName('pk_ board')).toBe('cavuno_audience_pk_%20board');
  });
});
