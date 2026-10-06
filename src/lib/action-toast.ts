import { m } from '../paraglide/messages';
import { requestToaster } from './deferred-toaster';

/**
 * The app's toast entry point. A single-line confirmation belongs in a
 * transient toast rather than a box that shifts the page. Success is polite;
 * failure is destructive.
 *
 * Every toast goes through here because the root mounts the Toaster lazily
 * (see deferred-toaster.ts): each call asks for it, so a toast raised as a
 * page loads (a greeting after a redirect, a failure while polling a Stripe
 * return) shows straight away instead of waiting for the visitor's first
 * click. sonner is imported dynamically so it stays out of the SSR bundle and
 * the first paint. Callers fire-and-forget: `void toastActionSuccess()`.
 */
async function loadToast() {
  requestToaster();
  const { toast } = await import('sonner');
  return toast;
}

export async function toastActionSuccess(message?: string): Promise<void> {
  const toast = await loadToast();
  toast.success(message ?? m.candidateAction_successText());
}

export async function toastActionError(message?: string): Promise<void> {
  const toast = await loadToast();
  toast.error(message ?? m.candidateAction_errorText());
}

export async function toastActionReconciliationError(): Promise<void> {
  const toast = await loadToast();
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
