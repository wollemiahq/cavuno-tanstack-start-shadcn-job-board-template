export type RecommendedJobsEmptyKind = 'needs-profile' | 'empty';

/**
 * Empty-state kind for /matches. Driven from the profile's skills and
 * interested roles (matches rank on either) and the resume parseStatus,
 * never from a hint on the recommendations list.
 */
export function recommendedJobsEmptyKind({
  skillCount,
  interestedRoleCount,
  parseStatus,
}: {
  skillCount: number;
  interestedRoleCount: number;
  parseStatus: 'parsing' | 'parsed' | 'failed' | null;
}): RecommendedJobsEmptyKind {
  if (parseStatus === 'parsing' || skillCount + interestedRoleCount === 0) {
    return 'needs-profile';
  }
  return 'empty';
}
