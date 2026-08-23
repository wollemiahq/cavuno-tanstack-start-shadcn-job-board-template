/**
 * Browser-side native Apply orchestration.
 *
 * The starter always asks Cavuno to prepare a native Apply. Cavuno can keep
 * returning `not_required`, or later require a browser-edge approval, without
 * changing this starter again. Country and IP never enter this interface.
 */

export type ApplyApprovalPlan =
  | {
      object: 'apply_approval_plan';
      kind: 'not_required';
    }
  | {
      object: 'apply_approval_plan';
      kind: 'approval_required';
      approvalUrl: string;
      expiresAt: string;
    };

export interface ApplyApprovalReceipt {
  object: 'apply_approval_receipt';
  id: string;
  expiresAt: string;
}

export type NativeApplyApprovalFailure =
  | 'denied'
  | 'malformed_plan'
  | 'malformed_receipt';

export class NativeApplyApprovalError extends Error {
  readonly reason: NativeApplyApprovalFailure;

  constructor(reason: NativeApplyApprovalFailure) {
    super('The application could not be submitted.');
    this.name = 'NativeApplyApprovalError';
    this.reason = reason;
  }
}

const OPAQUE_TOKEN_RE = /^[A-Za-z0-9_-]{20,300}$/;
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function validTimestamp(value: unknown): value is string {
  const timestamp = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return (
    typeof value === 'string' &&
    value.length <= 64 &&
    ISO_TIMESTAMP_RE.test(value) &&
    Number.isFinite(timestamp) &&
    timestamp > Date.now()
  );
}

function trustedApprovalUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 500) return false;
  try {
    const url = new URL(value);
    const opaque = url.pathname.startsWith('/r/')
      ? url.pathname.slice('/r/'.length)
      : '';
    return (
      url.protocol === 'https:' &&
      url.hostname === 'apply.cavuno.com' &&
      url.port === '' &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === '' &&
      url.pathname === `/r/${opaque}` &&
      OPAQUE_TOKEN_RE.test(opaque)
    );
  } catch {
    return false;
  }
}

export function parseApplyApprovalPlan(value: unknown): ApplyApprovalPlan {
  if (!value || typeof value !== 'object') {
    throw new NativeApplyApprovalError('malformed_plan');
  }
  const plan = value as Record<string, unknown>;
  if (
    plan.object !== 'apply_approval_plan' ||
    (plan.kind !== 'not_required' && plan.kind !== 'approval_required')
  ) {
    throw new NativeApplyApprovalError('malformed_plan');
  }
  if (plan.kind === 'not_required') {
    return { object: 'apply_approval_plan', kind: 'not_required' };
  }
  if (
    !trustedApprovalUrl(plan.approvalUrl) ||
    !validTimestamp(plan.expiresAt)
  ) {
    throw new NativeApplyApprovalError('malformed_plan');
  }
  return {
    object: 'apply_approval_plan',
    kind: 'approval_required',
    approvalUrl: plan.approvalUrl,
    expiresAt: plan.expiresAt,
  };
}

export function parseApplyApprovalReceipt(
  value: unknown,
): ApplyApprovalReceipt {
  if (!value || typeof value !== 'object') {
    throw new NativeApplyApprovalError('malformed_receipt');
  }
  const receipt = value as Record<string, unknown>;
  if (
    receipt.object !== 'apply_approval_receipt' ||
    typeof receipt.id !== 'string' ||
    !OPAQUE_TOKEN_RE.test(receipt.id) ||
    !validTimestamp(receipt.expiresAt)
  ) {
    throw new NativeApplyApprovalError('malformed_receipt');
  }
  return {
    object: 'apply_approval_receipt',
    id: receipt.id,
    expiresAt: receipt.expiresAt,
  };
}

export async function runNativeApply<Result>({
  jobSlug,
  prepare,
  submit,
  fetchGateway = (url, init) => fetch(url, init),
}: {
  jobSlug: string;
  prepare: (jobSlug: string) => Promise<unknown>;
  submit: (jobSlug: string, approvalReceipt?: string) => Promise<Result>;
  fetchGateway?: (url: string, init?: RequestInit) => Promise<Response>;
}): Promise<Result> {
  let rawPlan: unknown;
  try {
    rawPlan = await prepare(jobSlug);
  } catch {
    // Preparation is advisory for ordinary native jobs. If Cavuno cannot be
    // reached, preserve the pre-gateway native Apply path; the final API call
    // remains the authority and can still reject an ineligible application.
    return submit(jobSlug);
  }

  const plan = parseApplyApprovalPlan(rawPlan);
  if (plan.kind === 'not_required') return submit(jobSlug);

  let response: Response;
  try {
    response = await fetchGateway(plan.approvalUrl, {
      method: 'POST',
      credentials: 'omit',
      mode: 'cors',
      redirect: 'error',
    });
  } catch {
    // A network/CORS/edge outage is infrastructure failure, not evidence that
    // the candidate is ineligible.
    return submit(jobSlug);
  }

  if (response.status >= 500) return submit(jobSlug);
  if (response.status >= 400) {
    throw new NativeApplyApprovalError('denied');
  }
  if (!response.ok) return submit(jobSlug);

  let rawReceipt: unknown;
  try {
    rawReceipt = await response.json();
  } catch {
    throw new NativeApplyApprovalError('malformed_receipt');
  }
  const receipt = parseApplyApprovalReceipt(rawReceipt);
  return submit(jobSlug, receipt.id);
}
