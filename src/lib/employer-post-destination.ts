/**
 * Where a signed-in employer should post a job.
 *
 * The public `/post` wizard is the anonymous/guest surface. A manager with an
 * approved company posts from `/employers/companies/$slug/jobs/new` (billing
 * credits live there). Several companies means they pick one on the dashboard
 * first. `memberships === null` means the chrome session has not loaded
 * companies yet — callers must not treat that as "has none".
 */
export type EmployerPostDestination =
  | { kind: 'pending' }
  | { kind: 'stay' }
  | { kind: 'dashboard' }
  | { kind: 'company'; slug: string };

export function employerPostDestination(
  user: { emailVerified: boolean } | null,
  memberships: Array<{
    status: string;
    company: { slug: string | null };
  }> | null,
): EmployerPostDestination {
  if (!user) return { kind: 'stay' };
  if (user.emailVerified && memberships === null) return { kind: 'pending' };
  const slugs = (memberships ?? []).flatMap((membership) =>
    membership.status === 'approved' && membership.company.slug
      ? [membership.company.slug]
      : [],
  );
  if (slugs.length === 1) {
    const slug = slugs[0];
    if (slug) return { kind: 'company', slug };
  }
  if (slugs.length > 1) return { kind: 'dashboard' };
  return { kind: 'stay' };
}
