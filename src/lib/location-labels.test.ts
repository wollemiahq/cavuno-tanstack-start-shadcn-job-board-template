import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';
import {
  localizedRemoteRegion,
  remotePermitsLabel,
  type RemotePermit,
} from './location-labels';

const localeOpt = (language: string) =>
  isLocale(language) ? { locale: language } : undefined;
const region = (language: string, code: string) =>
  new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
const firstAndMore = (language: string, first: string, count: number) =>
  m.label_locationRemoteFirstAndMore({ first, count }, localeOpt(language));

describe('remotePermitsLabel', () => {
  it('names one country in the board language', () => {
    expect(remotePermitsLabel([{ type: 'country', value: 'DE' }], 'de')).toBe(
      region('de', 'DE'),
    );
  });

  it('names the first of several countries plus the rest', () => {
    const permits: RemotePermit[] = [
      { type: 'country', value: 'DE' },
      { type: 'country', value: 'AT' },
      { type: 'country', value: 'CH' },
    ];
    expect(remotePermitsLabel(permits, 'de')).toBe(
      firstAndMore('de', region('de', 'DE'), 2),
    );
  });

  it('uses the worldwide word when any permit is worldwide', () => {
    expect(
      remotePermitsLabel([{ type: 'worldwide', value: 'worldwide' }], 'de'),
    ).toBe(m.jobDetail_worldwideLabel({}, localeOpt('de')));
  });

  it('names a continent from its M.49 code', () => {
    const europe = region('de', '150');
    expect(europe).not.toBe('150');
    expect(
      remotePermitsLabel(
        [{ type: 'continent', value: 'Europe', code: '150' }],
        'de',
      ),
    ).toBe(europe);
    expect(
      remotePermitsLabel(
        [
          { type: 'continent', value: 'Europe', code: '150' },
          { type: 'continent', value: 'Americas', code: '019' },
        ],
        'de',
      ),
    ).toBe(firstAndMore('de', europe, 1));
  });

  it('keeps world-region acronyms and joins up to two of them', () => {
    expect(
      remotePermitsLabel([{ type: 'world_region', value: 'EMEA' }], 'de'),
    ).toBe('EMEA');
    expect(
      remotePermitsLabel(
        [
          { type: 'world_region', value: 'EMEA' },
          { type: 'world_region', value: 'APAC' },
        ],
        'de',
      ),
    ).toBe('EMEA, APAC');
    expect(
      remotePermitsLabel(
        [
          { type: 'world_region', value: 'EMEA' },
          { type: 'world_region', value: 'APAC' },
          { type: 'world_region', value: 'LATAM' },
        ],
        'de',
      ),
    ).toBe(firstAndMore('de', 'EMEA', 2));
  });

  it('returns null when any permit has no language-neutral name', () => {
    expect(
      remotePermitsLabel(
        [
          { type: 'country', value: 'DE' },
          { type: 'subdivision', value: 'US-NY' },
        ],
        'de',
      ),
    ).toBeNull();
    expect(
      remotePermitsLabel([{ type: 'custom', value: 'Nordics' }], 'de'),
    ).toBeNull();
    expect(
      remotePermitsLabel(
        [{ type: 'subregion', value: 'Central Europe' }],
        'de',
      ),
    ).toBeNull();
    // localizedRemoteRegion then keeps the API label whole.
    expect(
      localizedRemoteRegion(
        {
          remoteOption: 'remote',
          remoteLocationLabel: 'Germany + 1 more',
          remotePermits: [
            { type: 'country', value: 'DE' },
            { type: 'subdivision', value: 'US-NY' },
          ],
        },
        'de',
      ),
    ).toBe('Germany + 1 more');
  });

  it('names places in English on an English board', () => {
    expect(
      remotePermitsLabel(
        [
          { type: 'country', value: 'US' },
          { type: 'country', value: 'GB' },
        ],
        'en',
      ),
    ).toBe(firstAndMore('en', region('en', 'US'), 1));
    expect(
      remotePermitsLabel(
        [{ type: 'continent', value: 'Europe', code: '150' }],
        'en',
      ),
    ).toBe(region('en', '150'));
  });

  it('returns null for no permits', () => {
    expect(remotePermitsLabel([], 'de')).toBeNull();
  });
});
