import { describe, expect, it } from 'vitest';

import {
  defaultBillingSelection,
  hasJobPostingProduct,
} from './job-posting-catalog';

describe('hasJobPostingProduct', () => {
  it('is false when the board has no plans and no credits', () => {
    expect(hasJobPostingProduct({ plans: [], billingOptions: [] })).toBe(false);
  });

  it('is true when a job-posting plan is for sale', () => {
    expect(
      hasJobPostingProduct({
        plans: [{ id: 'plan-free' }],
        billingOptions: [],
      }),
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

describe('defaultBillingSelection', () => {
  it('is empty when there are no leftover credits', () => {
    expect(defaultBillingSelection([])).toBeNull();
  });

  it('skips exhausted credits', () => {
    expect(
      defaultBillingSelection([
        { id: 'spent', type: 'order', jobsRemaining: 0 },
      ]),
    ).toBeNull();
  });

  it('selects the first remaining credit', () => {
    expect(
      defaultBillingSelection([
        { id: 'spent', type: 'order', jobsRemaining: 0 },
        { id: 'left', type: 'order', jobsRemaining: 2 },
      ]),
    ).toBe('option:left');
  });

  it('prefers a membership post over a leftover order', () => {
    expect(
      defaultBillingSelection([
        { id: 'order-1', type: 'order', jobsRemaining: 1 },
        {
          id: 'member-1',
          type: 'plan_assignment',
          kind: 'member_post',
          jobsUnlimited: true,
        },
      ]),
    ).toBe('option:member-1');
  });

  it('prefers a plan assignment over a leftover order', () => {
    expect(
      defaultBillingSelection([
        { id: 'order-1', type: 'order', jobsRemaining: 1 },
        { id: 'assigned', type: 'plan_assignment', jobsRemaining: 3 },
      ]),
    ).toBe('option:assigned');
  });
});
