import { describe, expect, it } from 'vitest';

import { hasJobPostingProduct } from './job-posting-catalog';

describe('hasJobPostingProduct', () => {
  it('is false when the board has no plans and no credits', () => {
    expect(hasJobPostingProduct({ plans: [], billingOptions: [] })).toBe(false);
  });

  it('is true when a job-posting plan is for sale', () => {
    expect(
      hasJobPostingProduct({ plans: [{ id: 'plan-free' }], billingOptions: [] }),
    ).toBe(true);
  });

  it('is true when leftover credits remain even if nothing is for sale', () => {
    expect(
      hasJobPostingProduct({
        plans: [],
        billingOptions: [{ id: 'credit-1' }],
      }),
    ).toBe(true);
  });
});
