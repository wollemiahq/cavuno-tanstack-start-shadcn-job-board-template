import { isBoardApiError } from '@cavuno/board';

/**
 * The API refuses a sign-up or subscribe whose address's domain has no mail
 * server (422 `email_domain_undeliverable`), before anything is created or
 * emailed. `details.suggestion` is the corrected address when the domain
 * looks like a typo of a common one. Returns `null` for any other error.
 */
export function emailDomainRefusal<T>(
  error: T,
): { suggestion: string | null } | null {
  if (!isBoardApiError(error) || error.code !== 'email_domain_undeliverable') {
    return null;
  }
  // SAFETY: Board API error details are object records; the one field read
  // below is re-checked before use.
  const suggestion = (
    error.details as { suggestion?: unknown } | null | undefined
  )?.suggestion;
  return {
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- checks untrusted error details before use
    suggestion: typeof suggestion === 'string' ? suggestion : null,
  };
}
