import { getBoard } from '../lib/board';

import type { PostPlan } from '../board/plan-view-model';
import type { JobPostingPlan } from '@cavuno/board';

/**
 * Attach each posting plan's named features from the public plan catalogue.
 * The posting-plan read carries feature keys and values but not their names,
 * so an operator's custom attributes can only be rendered from here.
 * Attribute lines are additive copy: a failed catalogue read leaves the plans
 * without them rather than failing the page.
 */
export async function withCatalogFeatures(
  plans: Promise<JobPostingPlan[]>,
  headers: Record<string, string>,
): Promise<PostPlan[]> {
  const [postingPlans, catalog] = await Promise.all([
    plans,
    getBoard()
      .plans.list({}, { headers })
      .catch(() => null),
  ]);
  const featuresById = new Map(
    (catalog?.data ?? []).map((plan) => [plan.id, plan.features]),
  );
  return postingPlans.map((plan) => ({
    ...plan,
    catalogFeatures: featuresById.get(plan.id),
  }));
}
