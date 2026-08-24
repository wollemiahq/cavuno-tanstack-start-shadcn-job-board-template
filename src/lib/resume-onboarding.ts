/** Browser-local completion for the starter-owned optional resume offer. */
export const RESUME_ONBOARDING_COOKIE = 'cavuno_resume_onboarding_completed';

const RESUME_ONBOARDING_MAX_AGE = 365 * 24 * 60 * 60;

export function parseResumeOnboardingDismissal(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const pair = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${RESUME_ONBOARDING_COOKIE}=`));
  if (!pair) return null;
  const value = decodeURIComponent(
    pair.slice(RESUME_ONBOARDING_COOKIE.length + 1),
  );
  return value || null;
}

export function serializeResumeOnboardingDismissal(userId: string): string {
  return `${RESUME_ONBOARDING_COOKIE}=${encodeURIComponent(userId)}; Path=/; Max-Age=${RESUME_ONBOARDING_MAX_AGE}; SameSite=Lax`;
}
