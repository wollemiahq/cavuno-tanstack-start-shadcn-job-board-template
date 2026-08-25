import { m } from '../paraglide/messages';

/**
 * The canonical save-outcome toasts. A single-line confirmation belongs in a
 * transient toast rather than a box that shifts the page. Success is polite;
 * failure is destructive.
 *
 * sonner is imported dynamically so the toast module stays out of the SSR
 * bundle — these only ever fire from client event handlers (matching the
 * applicants kanban's convention). Callers fire-and-forget: `void
 * toastActionSuccess()`.
 */
export async function toastActionSuccess(message?: string): Promise<void> {
  const { toast } = await import('sonner');
  toast.success(message ?? m.candidateAction_successText());
}

export async function toastActionError(message?: string): Promise<void> {
  const { toast } = await import('sonner');
  toast.error(message ?? m.candidateAction_errorText());
}

export async function toastActionReconciliationError(): Promise<void> {
  const { toast } = await import('sonner');
  toast.warning(m.candidateAction_reconciliationError());
}

/**
 * Reconcile a mutation that has already committed. Refresh failure is a
 * distinct recovery state and must never be reported as if the write failed.
 */
export async function reconcileCommittedAction(
  reconcile: () => void | Promise<void>,
  reportFailure: () => void | Promise<void> = toastActionReconciliationError,
): Promise<boolean> {
  try {
    await reconcile();
    return true;
  } catch {
    try {
      await reportFailure();
    } catch {
      // Feedback transport is best-effort; the committed write remains truth.
    }
    return false;
  }
}
