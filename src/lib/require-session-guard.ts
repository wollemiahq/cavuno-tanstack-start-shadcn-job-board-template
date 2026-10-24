import { requiredSessionFailure } from './session-rejection';

import type { getSessionRecoveryOutcome } from './board';
import type { SessionContext } from './session-middleware';

/**
 * Run a session-required call: signed out → `UNAUTHENTICATED`; and when the
 * API revoked this request's session mid-call and the client seam signed the
 * viewer out (see `session-recovery.ts`), the resulting 401 becomes the same
 * `UNAUTHENTICATED` signal, so loaders redirect to sign-in. A transient
 * refresh failure rethrows its error instead, so the page shows an error
 * rather than sending a still-signed-in viewer to sign-in.
 */
export async function guardRequiredSession<T>(
  context: SessionContext,
  next: () => Promise<T>,
  recoveryOutcome: typeof getSessionRecoveryOutcome,
): Promise<T> {
  const { session, dataSource } = context;
  if (!session) {
    throw context.refreshError ?? new Error('UNAUTHENTICATED');
  }
  try {
    return await next();
  } catch (error) {
    throw requiredSessionFailure(
      error,
      await recoveryOutcome(dataSource, session.accessToken),
    );
  }
}
