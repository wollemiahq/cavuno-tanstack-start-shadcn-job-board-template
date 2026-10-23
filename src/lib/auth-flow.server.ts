import { BoardApiError } from '@cavuno/board';
import {
  appendResponseHeader,
  getRequestHeader,
} from '@tanstack/react-start/server';

import {
  authFlowToken,
  clearAuthFlowCookie,
  STORED_AUTH_FLOW_TOKEN,
  type AuthFlowKind,
} from './auth-flow';

export function resolveAuthFlowToken(
  kind: AuthFlowKind,
  supplied: string,
): string {
  const token = authFlowToken(getRequestHeader('cookie'), kind);
  if (token) return token;
  if (supplied && supplied !== STORED_AUTH_FLOW_TOKEN) return supplied;
  throw new BoardApiError({
    status: 401,
    code: 'board_auth_invalid_token',
    message: 'Authentication link expired',
    raw: undefined,
  });
}

export function finishAuthFlow(kind: AuthFlowKind) {
  appendResponseHeader('Set-Cookie', clearAuthFlowCookie(kind));
}
