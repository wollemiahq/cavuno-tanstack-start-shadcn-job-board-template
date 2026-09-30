import { describe, expect, it } from 'vitest';

import { developmentOriginParam } from './development-origin';

describe('developmentOriginParam', () => {
  it('sends nothing when no development origin is configured', () => {
    expect(developmentOriginParam(undefined, 'redirect')).toEqual({});
    expect(developmentOriginParam(undefined, 'email')).toEqual({});
  });

  it('sends a loopback origin for redirects and email links', () => {
    for (const origin of [
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://[::1]:3000',
    ]) {
      expect(developmentOriginParam(origin, 'redirect')).toEqual({
        developmentOrigin: origin,
      });
      expect(developmentOriginParam(origin, 'email')).toEqual({
        developmentOrigin: origin,
      });
    }
  });

  it('sends an https preview origin for redirects only', () => {
    const origin = 'https://preview.example.com';
    expect(developmentOriginParam(origin, 'redirect')).toEqual({
      developmentOrigin: origin,
    });
    expect(developmentOriginParam(origin, 'email')).toEqual({});
  });
});
