import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import type { JobPostingPlan } from '@cavuno/board';

function featureMap(plan: Pick<JobPostingPlan, 'features'>) {
  return new Map(
    (plan.features ?? []).flatMap((feature) =>
      feature.key ? [[feature.key, feature.value ?? ''] as const] : [],
    ),
  );
}

/**
 * Whether buying this plan lets the employer choose to feature THIS post.
 * False when there is no choice to make: the plan sells no featured slots,
 * or it features every post automatically — `jobs.feature_selection_mode`
 * is `auto` unless the operator explicitly set `manual` (the platform reads
 * a missing row the same way).
 */
export function planOffersFeaturedChoice(
  plan: Pick<JobPostingPlan, 'features'>,
): boolean {
  const byKey = featureMap(plan);
  if (byKey.get('jobs.feature_selection_mode') !== 'manual') return false;
  const slots = Number(byKey.get('jobs.featured_slots'));
  return Number.isFinite(slots) && slots > 0;
}

/**
 * Human-readable lines for a job-posting plan's structured features — the
 * `{key, value}` pairs the plans API emits (`jobs.duration_days`,
 * `jobs.max_active`, `jobs.featured_slots`, `jobs.feature_selection_mode`).
 * Unknown keys and malformed values are skipped rather than rendered raw.
 */
export function planFeatureLines(
  plan: Pick<JobPostingPlan, 'features'>,
): string[] {
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

  if (byKey.get('jobs.feature_selection_mode') === 'auto') {
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
