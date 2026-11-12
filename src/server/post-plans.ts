import type { PostPlan } from '../board/plan-view-model';
import type { JobPostingPlan, Plan } from '@cavuno/board';

/**
 * Key each posting plan's features by their canonical key, with the names the
 * posting-plan read carries, so an operator's custom attributes render as the
 * plan catalogue's `features` map would. No second read: the catalogue hides
 * job-posting plans on members-only boards.
 */
export async function withNamedFeatures(
  plans: Promise<JobPostingPlan[]>,
): Promise<PostPlan[]> {
  return (await plans).map((plan) => {
    const namedFeatures: Plan['features'] = {};
    for (const feature of plan.features) {
      if (!feature.key || !feature.value) continue;
      const entry: Plan['features'][string] = {
        value: feature.value,
        name: feature.name,
        dataType: feature.dataType,
      };
      if (feature.displayOrder !== null) {
        entry.displayOrder = feature.displayOrder;
      }
      namedFeatures[feature.key] = entry;
    }
    return { ...plan, namedFeatures };
  });
}
