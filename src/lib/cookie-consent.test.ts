import { describe, expect, it } from 'vitest';

import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_DECIDED_ATTRIBUTE,
  cookieBannerVersion,
  cookieConsentDecidedScript,
  parseCookieConsent,
  readCookieConsent,
  serializeCookieConsent,
  serializeReopenedCookieConsent,
} from './cookie-consent';

const ID = '0b0e7c3a-5d1f-4a2b-9c3d-4e5f6a7b8c9d';
const header = (setCookie: string) => setCookie.split(';')[0];

describe('consent cookie format', () => {
  it('round-trips a choice with its consent id', () => {
    expect(
      readCookieConsent(header(serializeCookieConsent('denied', ID))),
    ).toEqual({
      choice: 'denied',
      lastChoice: 'denied',
      consentId: ID,
    });
  });

  it('still reads a bare choice written before consent ids', () => {
    expect(readCookieConsent('cavuno_cookie_consent=accepted')).toEqual({
      choice: 'accepted',
      lastChoice: 'accepted',
      consentId: null,
    });
  });

  it('holds no choice while reopened, but keeps the id and last choice', () => {
    const reopened = header(serializeReopenedCookieConsent('accepted', ID));
    expect(readCookieConsent(reopened)).toEqual({
      choice: null,
      lastChoice: 'accepted',
      consentId: ID,
    });
    expect(parseCookieConsent(reopened)).toBeNull();
  });

  it('ignores an id that is not a UUID v4', () => {
    expect(
      readCookieConsent('cavuno_cookie_consent=denied.not-an-id')?.consentId,
    ).toBeNull();
  });
});

describe('cookieBannerVersion', () => {
  const copy = {
    title: 'Cookies',
    description: 'We use cookies.',
    acceptLabel: 'Accept',
    denyLabel: 'Decline',
  };
  const trackers = {
    cavunoAnalytics: true,
    ga4: false,
    gtm: false,
    metaPixel: false,
    linkedInInsight: false,
    adsense: false,
  };

  it('is stable for the same copy and trackers', () => {
    const version = cookieBannerVersion(copy, trackers);
    expect(version).toMatch(/^v1-[0-9a-f]{8}$/);
    expect(cookieBannerVersion({ ...copy }, { ...trackers })).toBe(version);
  });

  it('changes with the copy or the trackers', () => {
    const version = cookieBannerVersion(copy, trackers);
    expect(
      cookieBannerVersion({ ...copy, acceptLabel: 'OK' }, trackers),
    ).not.toBe(version);
    expect(cookieBannerVersion(copy, { ...trackers, ga4: true })).not.toBe(
      version,
    );
  });
});

describe('cookieConsentDecidedScript', () => {
  /** Runs the inline script against a stub document; true if it marked it. */
  function decided(cookie: string, stored: string | null = null): boolean {
    const root = { attrs: new Map<string, string>() };
    // oxlint-disable-next-line no-new-func -- the script ships as inline HTML
    const run = new Function(
      'document',
      'localStorage',
      cookieConsentDecidedScript(),
    );
    run(
      {
        cookie,
        documentElement: {
          setAttribute: (name: string, value: string) =>
            root.attrs.set(name, value),
        },
      },
      { getItem: () => stored },
    );
    return root.attrs.get(COOKIE_CONSENT_DECIDED_ATTRIBUTE) === 'decided';
  }
  it('marks a visitor whose cookie holds a choice', () => {
    expect(decided(header(serializeCookieConsent('accepted', ID)))).toBe(true);
    expect(decided(`a=1; ${header(serializeCookieConsent('denied'))}`)).toBe(
      true,
    );
  });

  it('leaves the banner for no choice, a reopened banner or an invalid cookie', () => {
    expect(decided('')).toBe(false);
    expect(
      decided(header(serializeReopenedCookieConsent('accepted', ID))),
    ).toBe(false);
    expect(decided(`${COOKIE_CONSENT_COOKIE}=maybe`)).toBe(false);
  });

  it('falls back to the localStorage mirror only without a valid cookie', () => {
    expect(decided('', 'accepted')).toBe(true);
    expect(
      decided(header(serializeReopenedCookieConsent('denied', ID)), 'denied'),
    ).toBe(false);
  });
});
