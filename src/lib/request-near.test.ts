import { describe, expect, it } from 'vitest';

import { approximateNear } from './request-near';

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
