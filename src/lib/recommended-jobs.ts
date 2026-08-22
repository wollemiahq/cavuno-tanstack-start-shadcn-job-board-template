export type RecommendedJobsEmptyKind = 'needs-profile' | 'empty';

/**
 * Empty-state kind for /matches. Driven from profile skills
 * and resume parseStatus, never from a hint on the recommendations list.
 */
export function recommendedJobsEmptyKind({
  skillCount,
  parseStatus,
}: {
  skillCount: number;
  parseStatus: 'parsing' | 'parsed' | 'failed' | null;
}): RecommendedJobsEmptyKind {
  if (parseStatus === 'parsing' || skillCount === 0) {
    return 'needs-profile';
  }
  return 'empty';
}
