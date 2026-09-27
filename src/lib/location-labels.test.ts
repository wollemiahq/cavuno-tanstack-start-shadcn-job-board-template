import { describe, expect, it } from 'vitest';

import {
  localizedLocationLabel,
  localizedOfficeLocationLabel,
} from './location-labels';

describe('localizedLocationLabel', () => {
  it('expands the structured country without changing earlier region text', () => {
    expect(localizedLocationLabel('Berlin, BE, DE', 'DE', 'en')).toBe(
      'Berlin, BE, Germany',
    );
    expect(localizedLocationLabel('Chicago, Illinois, US', 'US', 'en')).toBe(
      'Chicago, Illinois, United States',
    );
  });

  it('uses the viewer locale and preserves ambiguous labels without a code', () => {
    expect(localizedLocationLabel('Barcelona, Catalonia, ES', 'ES', 'es')).toBe(
      'Barcelona, Catalonia, España',
    );
    expect(localizedLocationLabel('San Francisco, CA', null, 'en')).toBe(
      'San Francisco, CA',
    );
    expect(localizedLocationLabel(null, 'US', 'en')).toBeNull();
  });

  it('appends the structured country when the label ends in a subdivision', () => {
    expect(localizedLocationLabel('Atlanta, GA', 'US', 'en')).toBe(
      'Atlanta, GA, United States',
    );
  });

  it('replaces a recognized country-code alias', () => {
    expect(localizedLocationLabel('London, UK', 'GB', 'en')).toBe(
      'London, United Kingdom',
    );
  });

  it('recognizes an English source label on a non-English board', () => {
    expect(localizedLocationLabel('Berlin, Germany', 'DE', 'de', 'de')).toBe(
      'Berlin, Deutschland',
    );
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

  it('does not interpret a subdivision suffix as a country', () => {
    expect(
      localizedOfficeLocationLabel(
        {
          displayName: 'Atlanta, GA',
          city: 'Atlanta',
          locality: null,
          region: 'GA',
          country: 'United States',
          countryCode: 'US',
        },
        'en',
      ),
    ).toBe('Atlanta, GA, United States');
  });
});
