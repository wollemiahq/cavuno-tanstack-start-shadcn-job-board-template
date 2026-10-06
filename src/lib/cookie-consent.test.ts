import { describe, expect, it } from 'vitest';

import {
  cookieBannerVersion,
  googleConsentMessageVersion,
  parseCookieConsent,
  readConsentId,
  readCookieConsent,
  serializeConsentId,
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

describe('googleConsentMessageVersion', () => {
  const trackers = {
    cavunoAnalytics: true,
    ga4: true,
    gtm: false,
    metaPixel: false,
    linkedInInsight: false,
    adsense: false,
  };
  const cmp = { cmpId: 300, cmpVersion: 7, tcfPolicyVersion: 5 };

  it('names the CMP build and is stable', () => {
    const version = googleConsentMessageVersion(cmp, trackers);
    expect(version).toMatch(/^g1-cmp300v7-[0-9a-f]{8}$/);
    expect(googleConsentMessageVersion({ ...cmp }, { ...trackers })).toBe(
      version,
    );
  });

  it('changes with the CMP build or the trackers', () => {
    const version = googleConsentMessageVersion(cmp, trackers);
    expect(
      googleConsentMessageVersion({ ...cmp, cmpVersion: 8 }, trackers),
    ).not.toBe(version);
    expect(
      googleConsentMessageVersion(cmp, { ...trackers, metaPixel: true }),
    ).not.toBe(version);
  });
});

describe('readConsentId', () => {
  it('prefers the consent cookie’s id, else the consent-id cookie', () => {
    const own = header(serializeConsentId(ID));
    const other = '1c1e7c3a-5d1f-4a2b-9c3d-4e5f6a7b8c9d';
    expect(readConsentId(own)).toBe(ID);
    expect(
      readConsentId(
        `${own}; ${header(serializeCookieConsent('denied', other))}`,
      ),
    ).toBe(other);
    expect(readConsentId('cavuno_consent_id=not-a-uuid')).toBeNull();
    expect(readConsentId('')).toBeNull();
  });
});
