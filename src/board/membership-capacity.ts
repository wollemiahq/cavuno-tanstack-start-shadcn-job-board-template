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
 *
 * Every key string here must be one the API actually sends. `Plan['features']`
 * is a self-describing record with no key union, so a misspelling type-checks,
 * reads `undefined`, and silently drops the benefit — it reached production
 * once as `talent.unlocks_per_period` / `talent.messages_per_period`, which the
 * API has never sent. The authority is the `PUT /v1/plans/{id}/features`
 * capability enum; check a key against it before adding one.
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

/**
 * One capacity key, parsed at this I/O boundary into a domain value:
 * the `unlimited` sentinel, a finite non-negative count, or `null` when the
 * key is absent or its value is not a number the board can honour.
 */
type Limit = MembershipAllowance | null;

function readLimit(features: MembershipFeatureMap, key: string): Limit {
  const raw = features?.[key]?.value;
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === UNLIMITED) return { kind: 'unlimited' };
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return { kind: 'count', count: parsed };
}

/** A limit's finite value, treating both `unlimited` and absent as zero. */
function finite(limit: Limit): number {
  return limit?.kind === 'count' ? limit.count : 0;
}

function readPosts(features: MembershipFeatureMap): MembershipPostsCapacity {
  const allowance = readLimit(features, 'jobs.included_posts');
  const cap = readLimit(features, 'jobs.max_active');
  // An absent cap is no cap — the allowance is then the only limit.
  const capped = cap?.kind === 'count';

  if (allowance?.kind === 'unlimited') {
    return capped ? slotsOrNone(cap.count) : { kind: 'unlimited' };
  }
  const included = finite(allowance);
  // Both sides finite: a non-zero allowance is what the member spends.
  if (included > 0) return { kind: 'credits', count: included };
  return capped ? slotsOrNone(cap.count) : { kind: 'none' };
}

function slotsOrNone(count: number): MembershipPostsCapacity {
  return count > 0 ? { kind: 'slots', count } : { kind: 'none' };
}

function readFeatured(
  features: MembershipFeatureMap,
): MembershipFeaturedCapacity {
  const allowance = readLimit(features, 'jobs.included_featured');
  const slots = readLimit(features, 'jobs.featured_slots');
  const allowanceUnlimited = allowance?.kind === 'unlimited';
  const slotsUnlimited = slots?.kind === 'unlimited';
  if (allowanceUnlimited && slotsUnlimited) return { kind: 'all' };

  // An absent featured limit reads as zero, not as "no cap".
  const included = finite(allowance);
  const concurrent = finite(slots);

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

/** An allowance is only worth a line when it is unlimited or a real count. */
function readAllowance(
  features: MembershipFeatureMap,
  key: string,
): MembershipAllowance | null {
  const limit = readLimit(features, key);
  if (limit === null) return null;
  if (limit.kind === 'unlimited') return limit;
  return limit.count > 0 ? limit : null;
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
      discount?.kind === 'count' && discount.count > 0 ? discount.count : null,
    talentUnlocks: readAllowance(features, 'talent.profile_unlocks'),
    talentMessages: readAllowance(features, 'talent.messages_sent'),
  };
}
