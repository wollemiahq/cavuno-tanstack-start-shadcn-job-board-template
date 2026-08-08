import { describe, expect, it } from 'vitest';

import { companyIntro } from './company-intro';

describe('companyIntro', () => {
  it('returns the trimmed platform summary', () => {
    expect(companyIntro('  Acme builds tools.  ')).toBe('Acme builds tools.');
  });

  it('returns null for missing or blank summary', () => {
    expect(companyIntro(null)).toBeNull();
    expect(companyIntro(undefined)).toBeNull();
    expect(companyIntro('')).toBeNull();
    expect(companyIntro('   ')).toBeNull();
  });
});
