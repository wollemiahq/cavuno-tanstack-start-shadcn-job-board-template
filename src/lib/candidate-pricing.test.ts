import { describe, expect, it } from 'vitest';

import { hasPaidCandidatePlans } from './candidate-pricing';

describe('candidate pricing visibility', () => {
  it('hides pricing without paid candidate plans', () => {
    expect(hasPaidCandidatePlans([])).toBe(false);
    expect(
      hasPaidCandidatePlans([{ purpose: 'job_seeker', kind: 'free' }]),
    ).toBe(false);
    expect(
      hasPaidCandidatePlans([{ purpose: 'membership', kind: 'subscription' }]),
    ).toBe(false);
  });
  it('shows pricing for a paid candidate plan', () => {
    expect(
      hasPaidCandidatePlans([{ purpose: 'job_seeker', kind: 'subscription' }]),
    ).toBe(true);
  });
});
