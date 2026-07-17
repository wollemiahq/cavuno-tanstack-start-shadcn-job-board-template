import { describe, expect, it } from 'vitest';

import { planFeatureLines } from './plan-view-model';

const plan = (features: { key: string | null; value: string | null }[]) => ({
  features,
});

describe('planFeatureLines', () => {
  it('maps the full job-posting feature set to readable lines', () => {
    expect(
      planFeatureLines(
        plan([
          { key: 'jobs.duration_days', value: '30' },
          { key: 'jobs.max_active', value: '5' },
          { key: 'jobs.featured_slots', value: '1' },
          { key: 'jobs.feature_selection_mode', value: 'manual' },
        ]),
      ),
    ).toEqual([
      'Live for 30 days',
      'Up to 5 active jobs',
      'Includes 1 featured post',
    ]);
  });

  it('prefers the auto-featured line over slot counting', () => {
    expect(
      planFeatureLines(
        plan([
          { key: 'jobs.featured_slots', value: '3' },
          { key: 'jobs.feature_selection_mode', value: 'auto' },
        ]),
      ),
    ).toEqual(['Every post is featured']);
  });

  it('reads unlimited active jobs and singular caps', () => {
    expect(
      planFeatureLines(
        plan([
          { key: 'jobs.max_active', value: 'unlimited' },
          { key: 'jobs.duration_days', value: '7' },
        ]),
      ),
    ).toEqual(['Live for 7 days', 'Unlimited active jobs']);
    expect(
      planFeatureLines(plan([{ key: 'jobs.max_active', value: '1' }])),
    ).toEqual(['1 active job at a time']);
  });

  it('skips unknown keys, malformed values, and null entries', () => {
    expect(
      planFeatureLines(
        plan([
          { key: 'talent.profile_unlocks', value: '25' },
          { key: 'jobs.duration_days', value: 'soon' },
          { key: 'jobs.featured_slots', value: '0' },
          { key: null, value: '9' },
        ]),
      ),
    ).toEqual([]);
  });
});
