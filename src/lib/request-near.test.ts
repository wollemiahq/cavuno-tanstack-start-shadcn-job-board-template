import { describe, expect, it } from 'vitest';

import {
  approximateNear,
  parseVisitorGeoHeader,
  requestCountry,
  requestNear,
  type RequestGeo,
} from './request-near';

function request(header?: string, cf?: RequestGeo) {
  const req = new Request('https://board.test/', {
    headers: header ? { 'X-Cavuno-Visitor-Geo': header } : {},
  });
  return Object.assign(req, { cf });
}

describe('approximateNear', () => {
  it('rounds the edge geo to one decimal so nearby visitors share a URL', () => {
    expect(
      approximateNear({ latitude: '-33.91024', longitude: '151.15417' }),
    ).toEqual({ lat: -33.9, lng: 151.2 });
    expect(approximateNear({ latitude: '-0.04', longitude: '0.01' })).toEqual({
      lat: 0,
      lng: 0,
    });
  });

  it('sends no point without usable geo', () => {
    expect(approximateNear(undefined)).toBeUndefined();
    expect(approximateNear({})).toBeUndefined();
    expect(approximateNear({ latitude: '51.5' })).toBeUndefined();
    expect(
      approximateNear({ latitude: '', longitude: '-0.12' }),
    ).toBeUndefined();
    expect(
      approximateNear({ latitude: '95', longitude: '10' }),
    ).toBeUndefined();
  });
});

describe('parseVisitorGeoHeader', () => {
  it('reads the pairs in any order and ignores unknown keys', () => {
    expect(
      parseVisitorGeoHeader('lng=151.2; extra=1; country=AU;lat=-33.9'),
    ).toEqual({ country: 'AU', lat: -33.9, lng: 151.2 });
    expect(parseVisitorGeoHeader('country=GB')).toEqual({ country: 'GB' });
  });

  it('drops invalid or half values', () => {
    expect(parseVisitorGeoHeader(null)).toEqual({});
    expect(parseVisitorGeoHeader('country=au; lat=91; lng=10')).toEqual({});
    expect(parseVisitorGeoHeader('country=AUS; lat=10')).toEqual({});
    expect(parseVisitorGeoHeader('lat=10; lng=181')).toEqual({});
    expect(parseVisitorGeoHeader('lat=x; lng=1; garbage')).toEqual({});
  });
});

describe('requestNear and requestCountry', () => {
  it('use the header when cf is missing', () => {
    const req = request('country=AU; lat=-33.9; lng=151.2');
    expect(requestNear(req)).toEqual({ lat: -33.9, lng: 151.2 });
    expect(requestCountry(req)).toBe('AU');
  });

  it('prefer cf over the header', () => {
    const req = request('country=AU; lat=-33.9; lng=151.2', {
      latitude: '51.5',
      longitude: '-0.12',
      country: 'GB',
    });
    expect(requestNear(req)).toEqual({ lat: 51.5, lng: -0.1 });
    expect(requestCountry(req)).toBe('GB');
  });

  it('return nothing without cf or header', () => {
    expect(requestNear(request())).toBeUndefined();
    expect(requestCountry(request())).toBeUndefined();
  });
});
