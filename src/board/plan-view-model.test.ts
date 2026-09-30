import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { planFeatureLines, planOffersFeaturedChoice } from './plan-view-model';

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
      m.planFeature_liveDays({ days: '30' }),
      m.planFeature_maxActive({ count: 5, countLabel: '5' }),
      m.planFeature_featured({ count: 1, countLabel: '1' }),
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
    ).toEqual([m.planFeature_featuredAuto()]);
  });

  it('reads unlimited active jobs and singular caps', () => {
    expect(
      planFeatureLines(
        plan([
          { key: 'jobs.max_active', value: 'unlimited' },
          { key: 'jobs.duration_days', value: '7' },
        ]),
      ),
    ).toEqual([
      m.planFeature_liveDays({ days: '7' }),
      m.planFeature_unlimitedActive(),
    ]);
    expect(
      planFeatureLines(plan([{ key: 'jobs.max_active', value: '1' }])),
    ).toEqual([m.planFeature_maxActive({ count: 1, countLabel: '1' })]);
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

describe('planOffersFeaturedChoice', () => {
  it('needs an explicit manual mode and at least one slot', () => {
    expect(
      planOffersFeaturedChoice(
        plan([
          { key: 'jobs.featured_slots', value: '2' },
          { key: 'jobs.feature_selection_mode', value: 'manual' },
        ]),
      ),
    ).toBe(true);
    expect(
      planOffersFeaturedChoice(
        plan([
          { key: 'jobs.featured_slots', value: 'unlimited' },
          { key: 'jobs.feature_selection_mode', value: 'manual' },
        ]),
      ),
    ).toBe(true);
  });

  it('offers nothing when the plan auto-features or sells no slot', () => {
    // A missing mode reads as `auto`, the platform's default.
    expect(
      planOffersFeaturedChoice(
        plan([{ key: 'jobs.featured_slots', value: '2' }]),
      ),
    ).toBe(false);
    expect(
      planOffersFeaturedChoice(
        plan([
          { key: 'jobs.featured_slots', value: '2' },
          { key: 'jobs.feature_selection_mode', value: 'auto' },
        ]),
      ),
    ).toBe(false);
    expect(
      planOffersFeaturedChoice(
        plan([
          { key: 'jobs.featured_slots', value: '0' },
          { key: 'jobs.feature_selection_mode', value: 'manual' },
        ]),
      ),
    ).toBe(false);
    expect(
      planOffersFeaturedChoice(
        plan([{ key: 'jobs.feature_selection_mode', value: 'manual' }]),
      ),
    ).toBe(false);
  });
});

it('shows unlimited featuring in manual mode', () => {
  expect(
    planFeatureLines(
      plan([
        { key: 'jobs.featured_slots', value: 'unlimited' },
        { key: 'jobs.feature_selection_mode', value: 'manual' },
      ]),
    ),
  ).toHaveLength(1);
});
