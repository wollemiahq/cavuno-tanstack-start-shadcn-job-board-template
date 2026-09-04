/**
 * Copy layer over `membership-capacity.ts`. The arithmetic that collapses the
 * four capacity keys into one fact lives there; this file turns that fact into
 * the ONE sentence a member reads ("3 one-time posts. 1 of them can be
 * featured.") plus the plan's remaining benefit lines.
 *
 * Same shape as `plan-view-model.ts`: unknown keys and malformed values are
 * skipped rather than rendered raw, and every string comes from the catalog.
 */
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import {
  readMembershipCapacity,
  type MembershipAllowance,
  type MembershipCapacity,
} from './membership-capacity';

import type { Plan } from '@cavuno/board';

function countLabel(count: number): string {
  return count.toLocaleString(getLocale());
}

/** The posts half of the capacity sentence, or `null` when the plan has none. */
function postsPhrase(capacity: MembershipCapacity): string | null {
  const posts = capacity.posts;
  if (posts.kind === 'unlimited') return m.membershipCapacity_postsUnlimited();
  if (posts.kind === 'credits') {
    return m.membershipCapacity_postsCredits({
      count: posts.count,
      countLabel: countLabel(posts.count),
    });
  }
  if (posts.kind === 'slots') {
    return m.membershipCapacity_postsSlots({
      count: posts.count,
      countLabel: countLabel(posts.count),
    });
  }
  return null;
}

/**
 * The featured half. It reads as a follow-on clause ("… of THEM …") whenever a
 * posts phrase precedes it, and stands on its own otherwise.
 */
function featuredPhrase(
  capacity: MembershipCapacity,
  hasPostsPhrase: boolean,
): string {
  const featured = capacity.featured;
  if (featured.kind === 'none') {
    return hasPostsPhrase
      ? m.membershipCapacity_featuredNoneOfThem()
      : m.membershipCapacity_featuredNone();
  }
  if (featured.kind === 'all') {
    return capacity.posts.kind === 'unlimited'
      ? m.membershipCapacity_featuredEveryPost()
      : m.membershipCapacity_featuredAll();
  }
  if (featured.kind === 'credits') {
    return m.membershipCapacity_featuredCredits({
      count: featured.count,
      countLabel: countLabel(featured.count),
    });
  }
  return m.membershipCapacity_featuredSlots({
    count: featured.count,
    countLabel: countLabel(featured.count),
  });
}

/**
 * The plan's posting capacity as one sentence. Posts first, then what may be
 * featured — never four separate limits the reader has to reconcile.
 */
export function membershipCapacitySentence(
  plan: Pick<Plan, 'features'>,
): string {
  const capacity = readMembershipCapacity(plan);
  const posts = postsPhrase(capacity);
  const featured = featuredPhrase(capacity, posts !== null);
  return posts ? `${posts}. ${featured}` : featured;
}

function allowanceLine(
  allowance: MembershipAllowance | null,
  unlimited: () => string,
  counted: (input: { count: number; countLabel: string }) => string,
): string | null {
  if (!allowance) return null;
  if (allowance.kind === 'unlimited') return unlimited();
  return counted({
    count: allowance.count,
    countLabel: countLabel(allowance.count),
  });
}

/**
 * The keys `membershipCapacitySentence` and the named lines below already
 * speak for. Anything else in `features` is operator-defined and gets a
 * generic line, so a board that adds a custom attribute renders it without a
 * code change.
 */
const NAMED_FEATURE_KEYS = new Set([
  'jobs.included_posts',
  'jobs.max_active',
  'jobs.included_featured',
  'jobs.featured_slots',
  'jobs.posting_discount_percent',
  'talent.profile_unlocks',
  'talent.messages_sent',
  'jobs.duration_days',
  // A mechanism, not a benefit: it decides HOW featured jobs are picked, and
  // its value is a word (`auto` / `manual`), so the generic line rendered
  // "auto Feature Selection Mode".
  'jobs.feature_selection_mode',
]);

/** Values that mean "the plan does not carry this", so no line is rendered. */
const EMPTY_VALUES = new Set(['', '0', 'false', 'no', 'none']);

/**
 * Every remaining benefit as a line, in the operator's display order. The API
 * returns no display copy, so the feature's own `name` carries the wording and
 * the catalog supplies only the count/unlimited framing around it.
 */
function genericFeatureLines(plan: Pick<Plan, 'features'>): string[] {
  return Object.entries(plan.features ?? {})
    .filter(([key]) => !NAMED_FEATURE_KEYS.has(key))
    .map(([, feature]) => ({
      name: feature.name,
      value: String(feature.value ?? '').trim(),
      order: feature.displayOrder ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter(
      (entry) => entry.name && !EMPTY_VALUES.has(entry.value.toLowerCase()),
    )
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      if (entry.value === 'unlimited') {
        return m.planFeature_unlimitedValue({ name: entry.name });
      }
      if (entry.value.toLowerCase() === 'true') return entry.name;
      const numeric = Number(entry.value);
      return m.planFeature_countedValue({
        name: entry.name,
        value: Number.isFinite(numeric)
          ? numeric.toLocaleString(getLocale())
          : entry.value,
      });
    });
}

/**
 * Everything a plan carries BESIDES its posting capacity — the member discount
 * on further posts, any talent-access allowances, then whatever else the
 * operator put on the plan.
 */
export function planBenefitLines(plan: Pick<Plan, 'features'>): string[] {
  const capacity = readMembershipCapacity(plan);
  // How long a listing runs is only a benefit to a plan that grants listings.
  // Every membership carries `jobs.duration_days` — the platform seeds it at 30
  // for every account — so a talent-access-only membership would otherwise
  // promise a listing duration for listings it does not include.
  const durationDays = Number(plan.features?.['jobs.duration_days']?.value);
  return [
    capacity.posts.kind !== 'none' &&
    Number.isFinite(durationDays) &&
    durationDays > 0
      ? m.planFeature_liveDays({
          days: durationDays.toLocaleString(getLocale()),
        })
      : null,
    capacity.postingDiscountPercent === null
      ? null
      : m.membershipBenefit_postingDiscount({
          percent: countLabel(capacity.postingDiscountPercent),
        }),
    allowanceLine(
      capacity.talentUnlocks,
      m.membershipBenefit_talentUnlocksUnlimited,
      m.employerLanding_featureProfileUnlocks,
    ),
    allowanceLine(
      capacity.talentMessages,
      m.membershipBenefit_talentMessagesUnlimited,
      m.employerLanding_featureMessages,
    ),
    ...genericFeatureLines(plan),
  ].filter((line) => line !== null);
}
