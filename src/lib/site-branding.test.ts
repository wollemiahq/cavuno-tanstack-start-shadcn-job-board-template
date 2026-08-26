import { describe, expect, it } from 'vitest';

import { backgroundImageUrl, httpsAssetUrl } from './site-branding';

describe('httpsAssetUrl', () => {
  it('accepts a trimmed https URL', () => {
    expect(httpsAssetUrl('  https://assets.cavuno.com/hero.png  ')).toBe(
      'https://assets.cavuno.com/hero.png',
    );
  });

  it('accepts an uppercase https scheme', () => {
    expect(httpsAssetUrl('HTTPS://assets.cavuno.com/hero.png')).toBe(
      'HTTPS://assets.cavuno.com/hero.png',
    );
  });

  it('rejects http, protocol-relative, blob, javascript, and empty values', () => {
    expect(httpsAssetUrl('http://evil.example/x.png')).toBeNull();
    expect(httpsAssetUrl('//cdn.example/x.png')).toBeNull();
    expect(httpsAssetUrl('blob:https://assets.cavuno.com/hero')).toBeNull();
    expect(httpsAssetUrl('javascript:alert(1)')).toBeNull();
    expect(httpsAssetUrl('')).toBeNull();
    expect(httpsAssetUrl('   ')).toBeNull();
    expect(httpsAssetUrl(null)).toBeNull();
    expect(httpsAssetUrl(undefined)).toBeNull();
  });
});

describe('backgroundImageUrl', () => {
  it('is null when src/branding.json is the stock empty file', () => {
    expect(backgroundImageUrl()).toBeNull();
  });
});
