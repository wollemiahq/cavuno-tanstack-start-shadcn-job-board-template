/**
 * A membership plan's posting capacity, read as ONE fact rather than four.
 *
 * The Board API stores capacity as four self-describing feature keys
 * (`jobs.included_posts`, `jobs.max_active`, `jobs.included_featured`,
 * `jobs.featured_slots`) whose values are strings, with the literal
 * `unlimited` as a sentinel. Read individually they contradict each other —
 * an allowance of 5 with no cap is five one-time CREDITS, while an unlimited
 * allowance capped at 5 is five concurrent SLOTS. This module collapses the
 * pair into a single discriminated fact so the copy layer renders one
 * sentence and never has to re-derive the rule.
 *
 * Pure and locale-free on purpose: the sentences live in
 * `membership-view-model.ts`, this file owns the arithmetic.
 */
import type { Plan } from '@cavuno/board';

/** The sentinel value the API uses for "no limit". */
const UNLIMITED = 'unlimited';

export type MembershipPostsCapacity =
  /** A pool of one-time posts that is spent, not recycled. */
  | { readonly kind: 'credits'; readonly count: number }
  /** Concurrent live listings; publishing again needs a slot to free up. */
  | { readonly kind: 'slots'; readonly count: number }
  | { readonly kind: 'unlimited' }
  /** The plan carries no posting capacity at all. */
  | { readonly kind: 'none' };

export type MembershipFeaturedCapacity =
  | { readonly kind: 'none' }
  | { readonly kind: 'all' }
  | { readonly kind: 'credits'; readonly count: number }
  | { readonly kind: 'slots'; readonly count: number };

export interface MembershipCapacity {
  readonly posts: MembershipPostsCapacity;
  readonly featured: MembershipFeaturedCapacity;
  /** Member discount on posts bought beyond the allowance, or `null`. */
  readonly postingDiscountPercent: number | null;
  /** Talent-access allowances carried by the membership, when present. */
  readonly talentUnlocks: MembershipAllowance | null;
  readonly talentMessages: MembershipAllowance | null;
}

export type MembershipAllowance =
  | { readonly kind: 'unlimited' }
  | { readonly kind: 'count'; readonly count: number };

/** Plan features are keyed by capability key; only the value matters here. */
export type MembershipFeatureMap = Plan['features'];

/** `unlimited`, a finite non-negative number, or `null` when absent/malformed. */
type Limit = 'unlimited' | number | null;

function readLimit(features: MembershipFeatureMap, key: string): Limit {
  const raw = features?.[key]?.value;
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === UNLIMITED) return UNLIMITED;
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readPosts(features: MembershipFeatureMap): MembershipPostsCapacity {
  const allowance = readLimit(features, 'jobs.included_posts');
  const cap = readLimit(features, 'jobs.max_active');
  // An absent cap is no cap — the allowance is the only limit.
  const capped = cap !== null && cap !== UNLIMITED;
  const unlimitedAllowance = allowance === UNLIMITED;

  if (unlimitedAllowance && !capped) return { kind: 'unlimited' };
  if (unlimitedAllowance && capped) return slotsOrNone(cap as number);
  // A finite (or absent) allowance beyond this point.
  const included = allowance === null ? 0 : (allowance as number);
  if (!capped)
    return included > 0
      ? { kind: 'credits', count: included }
      : { kind: 'none' };
  // Both sides finite: a non-zero allowance is what the member spends.
  if (included > 0) return { kind: 'credits', count: included };
  return slotsOrNone(cap as number);
}

function slotsOrNone(count: number): MembershipPostsCapacity {
  return count > 0 ? { kind: 'slots', count } : { kind: 'none' };
}

function readFeatured(
  features: MembershipFeatureMap,
): MembershipFeaturedCapacity {
  const allowance = readLimit(features, 'jobs.included_featured');
  const slots = readLimit(features, 'jobs.featured_slots');
  const allowanceUnlimited = allowance === UNLIMITED;
  const slotsUnlimited = slots === UNLIMITED;
  if (allowanceUnlimited && slotsUnlimited) return { kind: 'all' };

  // An absent featured limit reads as zero, not as "no cap".
  const included = allowanceUnlimited || allowance === null ? 0 : allowance;
  const concurrent = slotsUnlimited || slots === null ? 0 : slots;

  if (allowanceUnlimited) {
    return concurrent > 0
      ? { kind: 'slots', count: concurrent }
      : { kind: 'all' };
  }
  if (slotsUnlimited) {
    return included > 0
      ? { kind: 'credits', count: included }
      : { kind: 'all' };
  }
  if (included > 0) return { kind: 'credits', count: included };
  if (concurrent > 0) return { kind: 'slots', count: concurrent };
  return { kind: 'none' };
}

function readAllowance(
  features: MembershipFeatureMap,
  key: string,
): MembershipAllowance | null {
  const limit = readLimit(features, key);
  if (limit === null) return null;
  if (limit === UNLIMITED) return { kind: 'unlimited' };
  return limit > 0 ? { kind: 'count', count: limit } : null;
}

/** Collapse a membership plan's feature map into its capacity facts. */
export function readMembershipCapacity(
  plan: Pick<Plan, 'features'>,
): MembershipCapacity {
  const features = plan.features ?? {};
  const discount = readLimit(features, 'jobs.posting_discount_percent');
  return {
    posts: readPosts(features),
    featured: readFeatured(features),
    postingDiscountPercent:
      typeof discount === 'number' && discount > 0 ? discount : null,
    talentUnlocks: readAllowance(features, 'talent.unlocks_per_period'),
    talentMessages: readAllowance(features, 'talent.messages_per_period'),
  };
}
