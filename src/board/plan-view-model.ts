import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import type { JobPostingPlan } from '@cavuno/board';

/**
 * Human-readable lines for a job-posting plan's structured features — the
 * `{key, value}` pairs the plans API emits (`jobs.duration_days`,
 * `jobs.max_active`, `jobs.featured_slots`, `jobs.feature_selection_mode`).
 * Unknown keys and malformed values are skipped rather than rendered raw.
 */
export function planFeatureLines(
  plan: Pick<JobPostingPlan, 'features'>,
): string[] {
  const byKey = new Map(
    (plan.features ?? []).flatMap((feature) =>
      feature.key ? [[feature.key, feature.value ?? ''] as const] : [],
    ),
  );
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
        new Intl.PluralRules(locale).select(maxActive) === 'one'
          ? m.planFeature_maxActiveOne()
          : m.planFeature_maxActiveOther({
              count: maxActive.toLocaleString(locale),
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
        new Intl.PluralRules(locale).select(slots) === 'one'
          ? m.planFeature_featuredOne()
          : m.planFeature_featuredOther({
              count: slots.toLocaleString(locale),
            }),
      );
    }
  }

  return lines;
}
