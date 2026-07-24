import { isBoardApiError, type BoardAuthSession } from '@cavuno/board';
import {
  clearSessionCookie,
  parseSessionCookie,
  serializeSessionCookie,
  type BoardSession,
} from '@cavuno/board/server';
/**
 * Auth server functions. The SDK never
 * stores tokens on the server; these functions move the bearer pair in
 * and out of the `__Host-` session cookie.
 */
import { createServerFn } from '@tanstack/react-start';
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';

import { getBoard, getSessionRefresher } from '../lib/board';
import { sessionMiddleware } from '../lib/session-middleware';

function storeSession(session: BoardAuthSession): BoardSession {
  const next: BoardSession = {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  };
  setResponseHeader('Set-Cookie', serializeSessionCookie(next));
  return next;
}

/** Map API failures to a form-friendly result instead of a 500. */
function authError(error: unknown): {
  ok: false;
  code: string;
  message: string;
} {
  if (isBoardApiError(error)) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

export const signIn = createServerFn({ method: 'POST' })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.login(data);
      storeSession(session);
      return { ok: true as const, boardUser: session.boardUser };
    } catch (error) {
      return authError(error);
    }
  });

export const signUp = createServerFn({ method: 'POST' })
  .validator(
    (input: { email: string; password: string; displayName: string }) => input,
  )
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.register({
        role: 'candidate',
        method: 'emailpass',
        ...data,
      });
      storeSession(session);
      return { ok: true as const, boardUser: session.boardUser };
    } catch (error) {
      return authError(error);
    }
  });

/**
 * Employer sign-up — the branded `/auth/employer/sign-up` funnel. Same
 * emailpass registration as a candidate but `role: 'employer'`, which the API
 * gates on `employersEnabled` and auto-associates to a company by email
 * domain. No new API — mirrors the hosted `signUpEmployerWithPassword` action.
 */
export const signUpEmployer = createServerFn({ method: 'POST' })
  .validator(
    (input: { email: string; password: string; displayName: string }) => input,
  )
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.register({
        role: 'employer',
        method: 'emailpass',
        ...data,
      });
      storeSession(session);
      return { ok: true as const, boardUser: session.boardUser };
    } catch (error) {
      return authError(error);
    }
  });

/**
 * Force one bearer-pair rotation from the current session cookie. Unlike the
 * session middleware (which only rotates inside the `isExpiringSoon` window),
 * this always attempts a refresh — the recovery path when the API rejects an
 * access token the client still believes is live (clock skew, early
 * server-side expiry). Returns `{ ok: true }` and re-sets the cookie on
 * success; clears the cookie on a burned/revoked token; `{ ok: false }` when
 * there is nothing to refresh. Single-flight is preserved by the shared
 * refresher.
 */
export const refreshSession = createServerFn({ method: 'POST' }).handler(
  async () => {
    const session = parseSessionCookie(getRequestHeader('cookie') ?? null);
    if (!session) return { ok: false as const };
    try {
      const next = await getSessionRefresher()(session);
      if (!next) {
        setResponseHeader('Set-Cookie', clearSessionCookie());
        return { ok: false as const };
      }
      setResponseHeader('Set-Cookie', serializeSessionCookie(next));
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  },
);

export const signOut = createServerFn({ method: 'POST' })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    if (context.session) {
      try {
        await getBoard().auth.logout({
          refreshToken: context.session.refreshToken,
        });
      } catch {
        // Revoke is idempotent server-side; a network failure here must
        // not strand the user signed in locally.
      }
    }
    setResponseHeader('Set-Cookie', clearSessionCookie());
    return { ok: true as const };
  });

export const verifyEmail = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    try {
      await getBoard().auth.verifyEmail(data);
      return { ok: true as const };
    } catch (error) {
      return authError(error);
    }
  });

/**
 * OTP email verification. The signed-in-but-unverified user submits
 * the 6-digit code from the verification email; the call is scoped to their
 * session bearer, so it verifies THEIR email (no anonymous cross-user guessing).
 */
export const verifyOtpCode = createServerFn({ method: 'POST' })
  .validator((input: { code: string }) => input)
  .middleware([sessionMiddleware])
  .handler(async ({ data, context }) => {
    if (!context.session) {
      return {
        ok: false as const,
        code: 'unauthorized',
        message: 'Sign in first',
      };
    }
    try {
      await getBoard().auth.verifyEmailWithCode(data, {
        headers: context.authHeaders,
      });
      return { ok: true as const };
    } catch (error) {
      return authError(error);
    }
  });

/** Re-send the verification email (fresh code + magic link) to the signed-in user. */
export const resendOtp = createServerFn({ method: 'POST' })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    if (!context.session) {
      return {
        ok: false as const,
        code: 'unauthorized',
        message: 'Sign in first',
      };
    }
    try {
      await getBoard().auth.resendVerification({
        headers: context.authHeaders,
      });
      return { ok: true as const };
    } catch (error) {
      return authError(error);
    }
  });

export const forgotPassword = createServerFn({ method: 'POST' })
  .validator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    // Always 204 server-side (no account enumeration) — mirror that.
    await getBoard().auth.forgotPassword(data);
    return { ok: true as const };
  });

export const resetPassword = createServerFn({ method: 'POST' })
  .validator((input: { token: string; password: string }) => input)
  .handler(async ({ data }) => {
    try {
      await getBoard().auth.resetPassword(data);
      return { ok: true as const };
    } catch (error) {
      return authError(error);
    }
  });

export const requestMagicLink = createServerFn({ method: 'POST' })
  .validator((input: { email: string; returnTo?: string }) => input)
  .handler(async ({ data }) => {
    try {
      await getBoard().auth.requestMagicLink(data);
      return { ok: true as const };
    } catch (error) {
      return authError(error);
    }
  });

export const consumeMagicLink = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.consumeMagicLink(data);
      storeSession(session);
      return { ok: true as const, boardUser: session.boardUser };
    } catch (error) {
      return authError(error);
    }
  });

export const getOAuthAuthorizationUrl = createServerFn({ method: 'GET' })
  .validator(
    (input: { provider: 'google' | 'linkedin'; returnTo?: string }) => input,
  )
  .handler(async ({ data }) => {
    try {
      const { provider, ...query } = data;
      const result = await getBoard().auth.getOAuthAuthorizationUrl(
        provider,
        query,
      );
      return { ok: true as const, authorizeUrl: result.authorizeUrl };
    } catch (error) {
      return authError(error);
    }
  });

export const exchangeOAuth = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.exchangeOAuth(data);
      storeSession(session);
      return { ok: true as const, boardUser: session.boardUser };
    } catch (error) {
      return authError(error);
    }
  });
