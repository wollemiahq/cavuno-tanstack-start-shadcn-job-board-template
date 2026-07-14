import { describe, expect, it } from 'vitest';

import { salaryCurrencyOptions } from './salary-currencies';

describe('salaryCurrencyOptions', () => {
  const options = salaryCurrencyOptions();

  it('front-loads the common currencies in order', () => {
    // Mirrors the hosted posting form: the most-used currencies float to
    // the top so posters find them without scrolling the full ISO list.
    expect(options.slice(0, 5).map((o) => o.value)).toEqual([
      'USD',
      'EUR',
      'GBP',
      'AUD',
      'CAD',
    ]);
  });

  it('contains USD and EUR with matching value/label', () => {
    const usd = options.find((o) => o.value === 'USD');
    const eur = options.find((o) => o.value === 'EUR');
    expect(usd).toEqual({ value: 'USD', label: 'USD' });
    expect(eur).toEqual({ value: 'EUR', label: 'EUR' });
  });

  it('has no duplicate currency codes', () => {
    const codes = options.map((o) => o.value);
    expect(codes.length).toBe(new Set(codes).size);
  });

  it('sorts the tail (after the front-loaded set) alphabetically', () => {
    const tail = options.slice(5).map((o) => o.value);
    const sorted = [...tail].sort();
    expect(tail).toEqual(sorted);
  });

  it('is a superset of the front-loaded set drawn from the runtime ISO list', () => {
    // The runtime list is large (Intl.supportedValuesOf); guard against a
    // regression that would collapse it to just the front-loaded five.
    expect(options.length).toBeGreaterThan(20);
  });
});
