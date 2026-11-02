import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { planFeatureLines, planOffersFeaturedChoice } from './plan-view-model';

const plan = (
  features: { key: string | null; value: string | null }[],
  kind?: string,
) => ({ features, kind });

const kindPlan = (kind: string, values: Record<string, string>) =>
  plan(
    Object.entries(values).map(([key, value]) => ({ key, value })),
    kind,
  );

describe('planFeatureLines for a single post', () => {
  it.each(['one_time', 'free'])(
    'drops the capacity line and describes auto featuring for %s',
    (kind) => {
      expect(
        planFeatureLines(
          kindPlan(kind, {
            'jobs.duration_days': '30',
            'jobs.max_active': '1',
            'jobs.featured_slots': '1',
            'jobs.feature_selection_mode': 'auto',
          }),
        ),
      ).toEqual([
        m.planFeature_listedDays({ days: '30' }),
        m.planFeature_featuredAbove(),
        m.planFeature_featuredBadge(),
      ]);
    },
  );

  it('treats a missing selection mode as auto and unlimited as featured', () => {
    expect(
      planFeatureLines(
        kindPlan('one_time', { 'jobs.featured_slots': 'unlimited' }),
      ),
    ).toEqual([m.planFeature_featuredAbove(), m.planFeature_featuredBadge()]);
  });

  it('leaves manual featuring to the checkbox and skips unfeatured plans', () => {
    expect(
      planFeatureLines(
        kindPlan('one_time', {
          'jobs.duration_days': '30',
          'jobs.max_active': '1',
          'jobs.featured_slots': '1',
          'jobs.feature_selection_mode': 'manual',
        }),
      ),
    ).toEqual([m.planFeature_listedDays({ days: '30' })]);
    expect(
      planFeatureLines(
        kindPlan('one_time', {
          'jobs.max_active': '1',
          'jobs.featured_slots': '0',
          'jobs.feature_selection_mode': 'auto',
        }),
      ),
    ).toEqual([]);
  });
});

describe('planFeatureLines for a bundle', () => {
  it('counts posts and features all of them when slots cover the bundle', () => {
    expect(
      planFeatureLines(
        kindPlan('bundle', {
          'jobs.duration_days': '30',
          'jobs.max_active': '5',
          'jobs.featured_slots': '5',
          'jobs.feature_selection_mode': 'auto',
        }),
      ),
    ).toEqual([
      m.planFeature_bundlePosts({ count: 5, countLabel: '5' }),
      m.planFeature_eachListedDays({ days: '30' }),
      m.planFeature_allFeatured(),
    ]);
    expect(
      planFeatureLines(
        kindPlan('bundle', {
          'jobs.max_active': '1',
          'jobs.featured_slots': 'unlimited',
        }),
      ),
    ).toEqual([
      m.planFeature_bundlePosts({ count: 1, countLabel: '1' }),
      m.planFeature_allFeatured(),
    ]);
  });

  it('says how many can be featured when slots fall short or are chosen', () => {
    expect(
      planFeatureLines(
        kindPlan('bundle', {
          'jobs.max_active': '10',
          'jobs.featured_slots': '2',
          'jobs.feature_selection_mode': 'auto',
        }),
      ),
    ).toEqual([
      m.planFeature_bundlePosts({ count: 10, countLabel: '10' }),
      m.planFeature_bundleFeatured({ count: 2, countLabel: '2' }),
    ]);
    expect(
      planFeatureLines(
        kindPlan('bundle', {
          'jobs.max_active': '3',
          'jobs.featured_slots': '3',
          'jobs.feature_selection_mode': 'manual',
        }),
      ),
    ).toEqual([
      m.planFeature_bundlePosts({ count: 3, countLabel: '3' }),
      m.planFeature_bundleFeatured({ count: 3, countLabel: '3' }),
    ]);
  });

  it('skips a missing or malformed post count', () => {
    expect(
      planFeatureLines(
        kindPlan('bundle', {
          'jobs.max_active': 'lots',
          'jobs.duration_days': '14',
        }),
      ),
    ).toEqual([m.planFeature_eachListedDays({ days: '14' })]);
  });
});

describe('planFeatureLines for a subscription', () => {
  it('describes concurrent slots and partial featuring', () => {
    expect(
      planFeatureLines(
        kindPlan('subscription', {
          'jobs.duration_days': '30',
          'jobs.max_active': '5',
          'jobs.featured_slots': '1',
          'jobs.feature_selection_mode': 'manual',
        }),
      ),
    ).toEqual([
      m.planFeature_liveAtOnce({ count: 5, countLabel: '5' }),
      m.planFeature_eachListedDays({ days: '30' }),
      m.planFeature_featuredAtATime({ count: 1, countLabel: '1' }),
    ]);
    expect(
      planFeatureLines(kindPlan('subscription', { 'jobs.max_active': '1' })),
    ).toEqual([m.planFeature_liveAtOnce({ count: 1, countLabel: '1' })]);
  });

  it('features all of them when slots are unlimited or cover the cap', () => {
    expect(
      planFeatureLines(
        kindPlan('subscription', {
          'jobs.max_active': 'unlimited',
          'jobs.featured_slots': 'unlimited',
        }),
      ),
    ).toEqual([m.planFeature_unlimitedLive(), m.planFeature_allFeatured()]);
    expect(
      planFeatureLines(
        kindPlan('subscription', {
          'jobs.max_active': '3',
          'jobs.featured_slots': '3',
          'jobs.feature_selection_mode': 'auto',
        }),
      ),
    ).toEqual([
      m.planFeature_liveAtOnce({ count: 3, countLabel: '3' }),
      m.planFeature_allFeatured(),
    ]);
  });
});

describe('planFeatureLines for an unknown kind', () => {
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

  it('promises no featuring when an auto plan sells no featured slot', () => {
    // `auto` is the platform's default mode, so a plain plan carries it
    // alongside `featured_slots: 0`.
    expect(
      planFeatureLines(
        plan([
          { key: 'jobs.featured_slots', value: '0' },
          { key: 'jobs.feature_selection_mode', value: 'auto' },
        ]),
      ),
    ).toEqual([]);
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
