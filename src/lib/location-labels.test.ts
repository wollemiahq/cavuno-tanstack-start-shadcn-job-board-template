import { describe, expect, it } from 'vitest';

import {
  localizedLocationLabel,
  localizedOfficeLocationLabel,
} from './location-labels';

describe('localizedLocationLabel', () => {
  it('expands a trailing ISO country code without changing earlier region text', () => {
    expect(localizedLocationLabel('Berlin, BE, DE', 'en')).toBe(
      'Berlin, BE, Germany',
    );
    expect(localizedLocationLabel('Chicago, Illinois, US', 'en')).toBe(
      'Chicago, Illinois, United States',
    );
  });

  it('uses the viewer locale and preserves labels without a country-code suffix', () => {
    expect(localizedLocationLabel('Barcelona, Catalonia, ES', 'es')).toBe(
      'Barcelona, Catalonia, España',
    );
    expect(localizedLocationLabel('United States', 'de')).toBe('United States');
    expect(localizedLocationLabel(null, 'en')).toBeNull();
  });
});

describe('localizedOfficeLocationLabel', () => {
  it('localizes the structured country when no display name exists', () => {
    expect(
      localizedOfficeLocationLabel(
        {
          displayName: null,
          city: 'Berlin',
          locality: null,
          region: 'BE',
          country: 'DE',
          countryCode: 'DE',
        },
        'en',
      ),
    ).toBe('Berlin, BE, Germany');
  });

  it('re-localizes a full country name from the board locale', () => {
    expect(
      localizedOfficeLocationLabel(
        {
          displayName: 'Berlin, Germany',
          city: 'Berlin',
          locality: null,
          region: null,
          country: 'DE',
          countryCode: 'DE',
        },
        'de',
        'en',
      ),
    ).toBe('Berlin, Deutschland');
  });
});
