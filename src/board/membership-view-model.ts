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
 * Everything the membership carries BESIDES its posting capacity — the member
 * discount on further posts and any talent-access allowances.
 */
export function membershipBenefitLines(plan: Pick<Plan, 'features'>): string[] {
  const capacity = readMembershipCapacity(plan);
  return [
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
  ].filter((line) => line !== null);
}
