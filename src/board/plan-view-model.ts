import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import type { JobPostingPlan, Plan } from '@cavuno/board';

/** A posting plan plus the public catalogue's named features for the same plan. */
export type PostPlan = JobPostingPlan & {
  /**
   * The posting-plan read carries feature keys and values but not their
   * names, so an operator's custom attributes come from the plan catalogue.
   */
  catalogFeatures?: Plan['features'];
};

function featureMap(plan: Pick<JobPostingPlan, 'features'>) {
  return new Map(
    (plan.features ?? []).flatMap((feature) =>
      feature.key ? [[feature.key, feature.value ?? ''] as const] : [],
    ),
  );
}

/**
 * Whether the employer picks which posts to feature on this plan.
 * `jobs.feature_selection_mode` is `auto` (every post featured, nothing to
 * choose) unless the operator explicitly set `manual` — the platform reads
 * a missing row the same way.
 */
function planFeaturesManually(plan: Pick<JobPostingPlan, 'features'>): boolean {
  return featureMap(plan).get('jobs.feature_selection_mode') === 'manual';
}

/**
 * Whether buying this plan lets the employer choose to feature THIS post:
 * it selects manually and sells at least one featured slot (`unlimited` is
 * the same literal the platform uses for `jobs.max_active`).
 */
export function planOffersFeaturedChoice(
  plan: Pick<JobPostingPlan, 'features'>,
): boolean {
  if (!planFeaturesManually(plan)) return false;
  const raw = featureMap(plan).get('jobs.featured_slots');
  if (raw === 'unlimited') return true;
  const slots = Number(raw);
  return Number.isFinite(slots) && slots > 0;
}

type PlanWithFeatures = Pick<JobPostingPlan, 'features'> & {
  kind?: JobPostingPlan['kind'] | null;
};

/** A positive whole-number feature value, or null when absent or malformed. */
function positiveCount(raw: string | undefined): number | null {
  const value = Number(raw);
  return raw !== undefined && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * Human-readable lines for a job-posting plan's structured features — the
 * `{key, value}` pairs the plans API emits (`jobs.duration_days`,
 * `jobs.max_active`, `jobs.featured_slots`, `jobs.feature_selection_mode`).
 * What `jobs.max_active` and `jobs.featured_slots` mean depends on the plan's
 * `kind`: a bundle's cap is the number of posts it sells, a subscription's is
 * how many jobs stay live at once, and a single post's cap of 1 is internal
 * and never shown. A kind the starter does not know keeps the literal lines.
 * Unknown keys and malformed values are skipped rather than rendered raw.
 */
export function planFeatureLines(plan: PlanWithFeatures): string[] {
  switch (plan.kind) {
    case 'free':
    case 'one_time':
      return singlePostLines(plan);
    case 'bundle':
      return bundleLines(plan);
    case 'subscription':
      return subscriptionLines(plan);
    default:
      return literalFeatureLines(plan);
  }
}

function countLabel(count: number) {
  return { count, countLabel: count.toLocaleString(getLocale()) };
}

function durationDays(plan: PlanWithFeatures): string | null {
  const days = positiveCount(featureMap(plan).get('jobs.duration_days'));
  return days === null ? null : days.toLocaleString(getLocale());
}

/**
 * One post. Featuring it puts the listing above standard posts and gives it
 * the featured badge; a manual plan leaves that to the buyer's checkbox.
 */
function singlePostLines(plan: PlanWithFeatures): string[] {
  const lines: string[] = [];
  const days = durationDays(plan);
  if (days !== null) lines.push(m.planFeature_listedDays({ days }));

  const slots = featureMap(plan).get('jobs.featured_slots');
  const featured = slots === 'unlimited' || positiveCount(slots) !== null;
  if (featured && !planFeaturesManually(plan)) {
    lines.push(m.planFeature_featuredAbove(), m.planFeature_featuredBadge());
  }
  return lines;
}

/** A pack of posts: `jobs.max_active` is how many posts it sells. */
function bundleLines(plan: PlanWithFeatures): string[] {
  const byKey = featureMap(plan);
  const lines: string[] = [];
  const posts = positiveCount(byKey.get('jobs.max_active'));
  if (posts !== null) lines.push(m.planFeature_bundlePosts(countLabel(posts)));

  const days = durationDays(plan);
  if (days !== null) lines.push(m.planFeature_eachListedDays({ days }));

  const rawSlots = byKey.get('jobs.featured_slots');
  const manual = planFeaturesManually(plan);
  if (rawSlots === 'unlimited') {
    if (!manual) lines.push(m.planFeature_allFeatured());
    else if (posts !== null) {
      lines.push(m.planFeature_bundleFeatured(countLabel(posts)));
    }
    return lines;
  }
  const slots = positiveCount(rawSlots);
  if (slots === null) return lines;
  if (!manual && posts !== null && slots >= posts) {
    lines.push(m.planFeature_allFeatured());
  } else {
    const featurable = posts === null ? slots : Math.min(slots, posts);
    lines.push(m.planFeature_bundleFeatured(countLabel(featurable)));
  }
  return lines;
}

/** A subscription: `jobs.max_active` is how many jobs stay live at once. */
function subscriptionLines(plan: PlanWithFeatures): string[] {
  const byKey = featureMap(plan);
  const lines: string[] = [];
  const rawCap = byKey.get('jobs.max_active');
  const cap = positiveCount(rawCap);
  if (rawCap === 'unlimited') lines.push(m.planFeature_unlimitedLive());
  else if (cap !== null) lines.push(m.planFeature_liveAtOnce(countLabel(cap)));

  const days = durationDays(plan);
  if (days !== null) lines.push(m.planFeature_eachListedDays({ days }));

  const rawSlots = byKey.get('jobs.featured_slots');
  const slots = positiveCount(rawSlots);
  if (
    rawSlots === 'unlimited' ||
    (slots !== null &&
      cap !== null &&
      slots >= cap &&
      !planFeaturesManually(plan))
  ) {
    lines.push(m.planFeature_allFeatured());
  } else if (slots !== null) {
    lines.push(m.planFeature_featuredAtATime(countLabel(slots)));
  }
  return lines;
}

/** The pre-`kind` lines, kept for a plan kind the starter does not know. */
function literalFeatureLines(plan: PlanWithFeatures): string[] {
  const byKey = featureMap(plan);
  const lines: string[] = [];
  const locale = getLocale();

  const duration = Number(byKey.get('jobs.duration_days'));
  if (Number.isFinite(duration) && duration > 0) {
    lines.push(
      m.planFeature_liveDays({ days: duration.toLocaleString(locale) }),
    );
  }

  const maxActiveRaw = byKey.get('jobs.max_active');
  if (maxActiveRaw === 'unlimited') {
    lines.push(m.planFeature_unlimitedActive());
  } else {
    const maxActive = Number(maxActiveRaw);
    if (Number.isFinite(maxActive) && maxActive > 0) {
      lines.push(
        m.planFeature_maxActive({
          count: maxActive,
          countLabel: maxActive.toLocaleString(locale),
        }),
      );
    }
  }

  if (byKey.get('jobs.featured_slots') === 'unlimited') {
    lines.push(m.employerCompany_featuredUnlimitedText());
  } else if (
    byKey.get('jobs.feature_selection_mode') === 'auto' &&
    Number(byKey.get('jobs.featured_slots')) > 0
  ) {
    lines.push(m.planFeature_featuredAuto());
  } else {
    const slots = Number(byKey.get('jobs.featured_slots'));
    if (Number.isFinite(slots) && slots > 0) {
      lines.push(
        m.planFeature_featured({
          count: slots,
          countLabel: slots.toLocaleString(locale),
        }),
      );
    }
  }

  return lines;
}
