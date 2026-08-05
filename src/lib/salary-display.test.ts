import { describe, expect, it } from 'vitest';

import { formatJobSalary } from './salary-display';

/**
 * The salary join's unit is display copy — a noun the amount is measured
 * per ("$105K–$130K / year"), not the post-a-job form's option caption
 * ("Yearly"). Regression pin for the 4.0.0 adoption, which briefly wired
 * the form captions into the join and rendered "$105–130K / Yearly" in
 * English and "pro pro Jahr" in German.
 */
describe('formatJobSalary unit copy', () => {
  it('joins an English range with a unit noun, not the form caption', () => {
    const result = formatJobSalary('en', 105_000, 130_000, 'per_year', 'USD');
    expect(result).toContain('/ year');
    expect(result).not.toContain('Yearly');
  });

  it('German renders "pro Jahr" without doubling the preposition', () => {
    const result = formatJobSalary('de', 105_000, 130_000, 'per_year', 'EUR');
    expect(result).toContain('pro Jahr');
    expect(result).not.toMatch(/pro\s+pro/);
  });

  it('French renders "par an"', () => {
    const result = formatJobSalary('fr', 105_000, 130_000, 'per_year', 'EUR');
    expect(result).toContain('par an');
  });

  it('hourly uses the hour noun', () => {
    const result = formatJobSalary('en', 40, 60, 'per_hour', 'USD');
    expect(result).toContain('/ hour');
    expect(result).not.toContain('Hourly');
  });

  it('missing currency still renders no salary', () => {
    expect(
      formatJobSalary('en', 105_000, 130_000, 'per_year', null),
    ).toBeNull();
  });
});
