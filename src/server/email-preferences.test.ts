import { describe, expect, it } from 'vitest';

import { withConsentPage } from './email-preferences';

describe('withConsentPage', () => {
  const ORIGIN = 'https://board.example';
  const optIn = { marketing: true, consentText: 'Send me news', source: 'x' };

  it('records the page without the link token, keeping its other parameters', () => {
    expect(
      withConsentPage(
        optIn,
        'https://board.example/email-preferences?token=secret&lang=de',
        ORIGIN,
      ),
    ).toEqual({
      ...optIn,
      pageUrl: 'https://board.example/email-preferences?lang=de',
    });
  });

  it('adds no page to a change without consent wording, or with no usable referer', () => {
    const off = { marketing: false };
    expect(
      withConsentPage(
        off,
        'https://board.example/email-preferences?token=t',
        ORIGIN,
      ),
    ).toEqual(off);
    expect(withConsentPage(optIn, null, ORIGIN)).toEqual(optIn);
    expect(withConsentPage(optIn, 'not a url', ORIGIN)).toEqual(optIn);
  });

  it('never keeps a page the browser sent, nor one on another site', () => {
    const sent = { ...optIn, pageUrl: 'https://board.example/?token=leak' };
    expect(withConsentPage(sent, null, ORIGIN)).toEqual(optIn);
    expect(
      withConsentPage(sent, 'https://other.example/email-preferences', ORIGIN),
    ).toEqual(optIn);
  });
});
