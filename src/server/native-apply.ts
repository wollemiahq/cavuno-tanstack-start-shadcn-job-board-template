import { APPLY_SESSION_COOKIE, applySessionKey } from './apply-intent';

import { withApplyGatewayCapability } from '@/lib/board';
import type {
  Application,
  ApplyApprovalPlan,
  ApplyBody,
  BoardSdk,
} from '@cavuno/board';

export interface ApplyCookieOptions {
  path: '/';
  secure: true;
  httpOnly: true;
  sameSite: 'lax';
  maxAge: number;
}

type PersistApplyCookie = (
  name: string,
  value: string,
  options: ApplyCookieOptions,
) => void;

/**
 * Resolve the host-owned duplicate Apply key and append its cookie when one
 * does not yet exist. The adapter uses TanStack Start's `setCookie`, whose h3
 * implementation appends distinct cookies, so session rotation and this key
 * survive the same server-function response.
 */
export function ensureApplySession(
  cookieHeader: string | null,
  persist: PersistApplyCookie,
  create?: () => string,
): string {
  const resolved = applySessionKey(cookieHeader, create);
  if (resolved.setCookie) {
    persist(APPLY_SESSION_COOKIE, resolved.sessionKey, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1_800,
    });
  }
  return resolved.sessionKey;
}

export function prepareNativeApply(
  board: BoardSdk,
  jobSlug: string,
  sessionKey: string,
  headers: Record<string, string>,
): Promise<ApplyApprovalPlan> {
  return board.jobs.prepareApplyApproval(
    jobSlug,
    { sessionKey },
    { headers: withApplyGatewayCapability(headers) },
  );
}

const RECEIPT_ID_RE = /^[A-Za-z0-9_-]{20,300}$/;

function safeApplyBody(body: ApplyBody | undefined): ApplyBody {
  if (!body || typeof body !== 'object') return {};
  return {
    ...(typeof body.name === 'string' ? { name: body.name } : {}),
    ...(typeof body.email === 'string' ? { email: body.email } : {}),
    ...(typeof body.coverNote === 'string'
      ? { coverNote: body.coverNote }
      : {}),
  };
}

export function submitNativeApply(
  board: BoardSdk,
  jobSlug: string,
  body: ApplyBody | undefined,
  approvalReceipt: string | undefined,
  sessionKey: string,
  headers: Record<string, string>,
): Promise<Application> {
  if (approvalReceipt && !RECEIPT_ID_RE.test(approvalReceipt)) {
    throw new Error('Invalid Apply approval receipt');
  }
  return board.jobs.apply(
    jobSlug,
    {
      ...safeApplyBody(body),
      ...(approvalReceipt
        ? {
            approvalReceipt,
            approvalSessionKey: sessionKey,
          }
        : {}),
    },
    { headers: withApplyGatewayCapability(headers) },
  );
}
