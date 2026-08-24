/** Browser-local completion for the starter-owned optional resume offer. */
export const RESUME_ONBOARDING_COOKIE = 'cavuno_resume_onboarding_completed';

const RESUME_ONBOARDING_MAX_AGE = 365 * 24 * 60 * 60;

export function parseResumeOnboardingDismissal(
  cookieHeader: string | null | undefined,
): string[] {
  if (!cookieHeader) return [];
  const completed = new Set<string>();
  const perUserPrefix = `${RESUME_ONBOARDING_COOKIE}_`;

  for (const part of cookieHeader.split(';')) {
    const [name, rawValue = ''] = part.trim().split('=', 2);
    try {
      // Read the first single-value version as a migration path for browsers
      // that received it during development before per-user cookies shipped.
      if (name === RESUME_ONBOARDING_COOKIE && rawValue) {
        completed.add(decodeURIComponent(rawValue));
      } else if (name.startsWith(perUserPrefix) && rawValue === '1') {
        completed.add(decodeURIComponent(name.slice(perUserPrefix.length)));
      }
    } catch {
      // Ignore malformed browser preferences instead of blocking onboarding.
    }
  }

  return [...completed];
}

export function serializeResumeOnboardingDismissal(userId: string): string {
  const name = `${RESUME_ONBOARDING_COOKIE}_${encodeURIComponent(userId)}`;
  return `${name}=1; Path=/; Max-Age=${RESUME_ONBOARDING_MAX_AGE}; SameSite=Lax`;
}
