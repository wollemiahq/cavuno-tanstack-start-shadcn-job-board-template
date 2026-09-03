import { describe, expect, it } from 'vitest';

import {
  readMembershipCapacity,
  type MembershipFeatureMap,
} from './membership-capacity';

/**
 * Capacity is four wire keys read as one fact. The pairs are deliberately
 * ambiguous on their own — 5 posts with no cap is five CREDITS, unlimited
 * posts capped at 5 is five SLOTS — so each case below states the expected
 * reading independently rather than replaying the branch.
 */
function features(values: Record<string, string>): MembershipFeatureMap {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      { value, name: key, dataType: 'string' },
    ]),
  );
}

const capacity = (values: Record<string, string>) =>
  readMembershipCapacity({ features: features(values) });

describe('membership posting capacity', () => {
  it('reads an allowance with no cap as one-time credits', () => {
    expect(capacity({ 'jobs.included_posts': '5' }).posts).toEqual({
      kind: 'credits',
      count: 5,
    });
  });

  it('reads an allowance against an explicitly unlimited cap as credits', () => {
    expect(
      capacity({
        'jobs.included_posts': '3',
        'jobs.max_active': 'unlimited',
      }).posts,
    ).toEqual({ kind: 'credits', count: 3 });
  });

  it('reads an unlimited allowance against a finite cap as concurrent slots', () => {
    expect(
      capacity({
        'jobs.included_posts': 'unlimited',
        'jobs.max_active': '10',
      }).posts,
    ).toEqual({ kind: 'slots', count: 10 });
  });

  it('reads both sides unlimited as unlimited posting', () => {
    expect(
      capacity({
        'jobs.included_posts': 'unlimited',
        'jobs.max_active': 'unlimited',
      }).posts,
    ).toEqual({ kind: 'unlimited' });
  });

  it('lets a non-zero allowance win over a finite cap', () => {
    expect(
      capacity({ 'jobs.included_posts': '2', 'jobs.max_active': '4' }).posts,
    ).toEqual({ kind: 'credits', count: 2 });
  });

  it('falls back to the cap as slots when the allowance is zero', () => {
    expect(
      capacity({ 'jobs.included_posts': '0', 'jobs.max_active': '4' }).posts,
    ).toEqual({ kind: 'slots', count: 4 });
  });

  it('carries no posting capacity when neither key is set', () => {
    expect(capacity({}).posts).toEqual({ kind: 'none' });
  });

  it('ignores a malformed value rather than rendering it raw', () => {
    expect(capacity({ 'jobs.included_posts': 'lots' }).posts).toEqual({
      kind: 'none',
    });
  });
});

describe('membership featured capacity', () => {
  it('is none when neither featured key is set', () => {
    expect(capacity({}).featured).toEqual({ kind: 'none' });
  });

  it('is none when both featured keys are zero', () => {
    expect(
      capacity({
        'jobs.included_featured': '0',
        'jobs.featured_slots': '0',
      }).featured,
    ).toEqual({ kind: 'none' });
  });

  it('is all when both featured keys are unlimited', () => {
    expect(
      capacity({
        'jobs.included_featured': 'unlimited',
        'jobs.featured_slots': 'unlimited',
      }).featured,
    ).toEqual({ kind: 'all' });
  });

  it('takes the finite allowance as a featured credit count', () => {
    expect(
      capacity({
        'jobs.included_featured': '2',
        'jobs.featured_slots': 'unlimited',
      }).featured,
    ).toEqual({ kind: 'credits', count: 2 });
  });

  it('takes the finite slot count as concurrent featured slots', () => {
    expect(
      capacity({
        'jobs.included_featured': 'unlimited',
        'jobs.featured_slots': '3',
      }).featured,
    ).toEqual({ kind: 'slots', count: 3 });
  });

  it('reads an absent slot count as zero, not as no cap', () => {
    expect(capacity({ 'jobs.included_featured': '1' }).featured).toEqual({
      kind: 'credits',
      count: 1,
    });
  });
});

describe('membership extras', () => {
  it('reads the member posting discount', () => {
    expect(
      capacity({ 'jobs.posting_discount_percent': '25' })
        .postingDiscountPercent,
    ).toBe(25);
  });

  it('drops a zero discount rather than advertising 0% off', () => {
    expect(
      capacity({ 'jobs.posting_discount_percent': '0' }).postingDiscountPercent,
    ).toBeNull();
  });

  it('reads talent allowances, keeping the unlimited sentinel', () => {
    const result = capacity({
      'talent.unlocks_per_period': 'unlimited',
      'talent.messages_per_period': '50',
    });

    expect(result.talentUnlocks).toEqual({ kind: 'unlimited' });
    expect(result.talentMessages).toEqual({ kind: 'count', count: 50 });
  });

  it('has no talent allowances on a plain posting membership', () => {
    const result = capacity({ 'jobs.included_posts': '1' });

    expect(result.talentUnlocks).toBeNull();
    expect(result.talentMessages).toBeNull();
  });
});
