import { isTrustedApplyGatewayUrl } from './apply-gateway-url';
import { searchString } from './pagination';

import type {
  ApplyApprovalPlan as BoardApplyApprovalPlan,
  ApplyApprovalReceipt as BoardApplyApprovalReceipt,
} from '@cavuno/board';

/**
 * Browser-side native Apply orchestration.
 *
 * The starter always asks Cavuno to prepare a native Apply. Cavuno can keep
 * returning `not_required`, or later require a browser-edge approval, without
 * changing this starter again. Country and IP never enter this interface.
 */

export type ApplyApprovalPlan = BoardApplyApprovalPlan;
export type ApplyApprovalReceipt = BoardApplyApprovalReceipt;
type ApplyApprovalPlanWire = {
  object?: string;
  kind?: string;
  approvalUrl?: string;
  expiresAt?: string;
};
type ApplyApprovalReceiptWire = {
  object?: string;
  id?: string;
  expiresAt?: string;
};
export type NativeApplyPrepareResult =
  | ApplyApprovalPlan
  | ApplyApprovalPlanWire
  | null
  | undefined;

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

function validTimestamp<T>(value: T): string | undefined {
  const text = searchString(value);
  const timestamp = text ? Date.parse(text) : Number.NaN;
  return text !== undefined &&
    text.length <= 64 &&
    ISO_TIMESTAMP_RE.test(text) &&
    Number.isFinite(timestamp) &&
    timestamp > Date.now()
    ? text
    : undefined;
}

function trustedApprovalUrl<T>(value: T): string | undefined {
  const text = searchString(value);
  if (!text || text.length > 500) return undefined;
  try {
    const url = new URL(text);
    const opaque = url.pathname.startsWith('/r/')
      ? url.pathname.slice('/r/'.length)
      : '';
    return OPAQUE_TOKEN_RE.test(opaque) &&
      isTrustedApplyGatewayUrl(url, 'r', opaque)
      ? text
      : undefined;
  } catch {
    return undefined;
  }
}

function planWire<T>(value: T): ApplyApprovalPlanWire | null {
  if (value === null || value === undefined || Object(value) !== value) {
    return null;
  }
  // SAFETY: The parser only reads optional scalar protocol fields after this
  // object boundary check and validates each field before constructing a plan.
  return value as ApplyApprovalPlanWire;
}

function receiptWire<T>(value: T): ApplyApprovalReceiptWire | null {
  if (value === null || value === undefined || Object(value) !== value) {
    return null;
  }
  // SAFETY: The parser only reads optional scalar protocol fields after this
  // object boundary check and validates each field before constructing a receipt.
  return value as ApplyApprovalReceiptWire;
}

export function parseApplyApprovalPlan<T>(value: T): ApplyApprovalPlan {
  const plan = planWire(value);
  if (!plan) {
    throw new NativeApplyApprovalError('malformed_plan');
  }
  if (
    plan.object !== 'apply_approval_plan' ||
    (plan.kind !== 'not_required' && plan.kind !== 'approval_required')
  ) {
    throw new NativeApplyApprovalError('malformed_plan');
  }
  if (plan.kind === 'not_required') {
    return { object: 'apply_approval_plan', kind: 'not_required' };
  }
  const approvalUrl = trustedApprovalUrl(plan.approvalUrl);
  const expiresAt = validTimestamp(plan.expiresAt);
  if (!approvalUrl || !expiresAt) {
    throw new NativeApplyApprovalError('malformed_plan');
  }
  return {
    object: 'apply_approval_plan',
    kind: 'approval_required',
    approvalUrl,
    expiresAt,
  };
}

export function parseApplyApprovalReceipt<T>(value: T): ApplyApprovalReceipt {
  const receipt = receiptWire(value);
  if (!receipt) {
    throw new NativeApplyApprovalError('malformed_receipt');
  }
  const id = searchString(receipt.id);
  const expiresAt = validTimestamp(receipt.expiresAt);
  if (
    receipt.object !== 'apply_approval_receipt' ||
    !id ||
    !OPAQUE_TOKEN_RE.test(id) ||
    !expiresAt
  ) {
    throw new NativeApplyApprovalError('malformed_receipt');
  }
  return {
    object: 'apply_approval_receipt',
    id,
    expiresAt,
  };
}

export async function runNativeApply<Result>({
  jobSlug,
  prepare,
  submit,
  fetchGateway = (url, init) => fetch(url, init),
}: {
  jobSlug: string;
  prepare: (jobSlug: string) => Promise<NativeApplyPrepareResult>;
  submit: (jobSlug: string, approvalReceipt?: string) => Promise<Result>;
  fetchGateway?: (url: string, init?: RequestInit) => Promise<Response>;
}): Promise<Result> {
  let rawPlan: NativeApplyPrepareResult;
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
  // A missing/expired edge row is unavailable infrastructure, not a country
  // denial. The final Board API still performs the profile/job check.
  if (response.status === 404) return submit(jobSlug);
  if (response.status >= 400) {
    throw new NativeApplyApprovalError('denied');
  }
  if (!response.ok) return submit(jobSlug);

  let rawReceipt: unknown;
  try {
    rawReceipt = await response.json();
  } catch {
    return submit(jobSlug);
  }
  let receipt: ApplyApprovalReceipt;
  try {
    receipt = parseApplyApprovalReceipt(rawReceipt);
  } catch {
    // A trusted gateway protocol mismatch is also an availability failure for
    // ordinary jobs; omit the receipt and let Cavuno's final decision degrade.
    return submit(jobSlug);
  }
  return submit(jobSlug, receipt.id);
}
