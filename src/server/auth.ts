import {
  isBoardApiError,
  isSignInMethodUnavailable,
  type AvailableSignInMethods,
  type BoardAuthSession,
} from '@cavuno/board';
/**
 * Auth server functions. The SDK never
 * stores tokens on the server; these functions move the bearer pair in
 * and out of the `__Host-` session cookie for the **active data source**
 * (dual-source: primary and demo sessions are isolated by cookie name).
 */
import { createServerFn } from '@tanstack/react-start';
import {
  getRequestHeader,
  setCookie,
  setResponseHeader,
} from '@tanstack/react-start/server';
import { waitUntil } from 'cloudflare:workers';

import { authHeaders, getBoard, getSessionRefresher } from '../lib/board';
import {
  clearSessionForSource,
  getDataSource,
  persistAuthSession,
  parseSessionForSource,
  serializeSessionForSource,
} from '../lib/data-source.server';
import {
  developmentOriginParam,
  type DevelopmentOriginUse,
} from '../lib/development-origin';
import { getServerEnv } from '../lib/env';
import { sessionMiddleware } from '../lib/session-middleware';
import {
  SSO_EMAIL_UNCONFIRMED_COOKIE,
  SSO_EMAIL_UNCONFIRMED_MAX_AGE,
} from '../lib/sso-email-confirmation';

/** Map API failures to a form-friendly result instead of a 500. */
type AuthActionError = {
  ok: false;
  code: string;
  message: string;
  /**
   * On `board_auth_method_unavailable`: what the account's role can sign in
   * with instead.
   */
  availableMethods?: AvailableSignInMethods;
};

function authError<T>(error: T): AuthActionError {
  if (isSignInMethodUnavailable(error)) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      availableMethods: error.details.availableMethods,
    };
  }
  if (isBoardApiError(error)) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

/** `developmentOrigin` for this deployment, when `CAVUNO_DEVELOPMENT_ORIGIN` is set. */
function developmentOrigin(use: DevelopmentOriginUse) {
  return developmentOriginParam(getServerEnv().developmentOrigin, use);
}

function authExchangeIsNewUser(
  session: BoardAuthSession & { isNewUser?: boolean },
): boolean {
  return session.isNewUser === true;
}

export const signIn = createServerFn({ method: 'POST' })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.login(data);
      persistAuthSession(session);
      return { ok: true as const, boardUser: session.boardUser };
    } catch (error) {
      return authError(error);
    }
  });

export const signUp = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      email: string;
      password: string;
      displayName: string;
      /** True only when the rendered marketing checkbox was ticked. */
      marketingConsent?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.register({
        role: 'candidate',
        method: 'emailpass',
        ...data,
        ...developmentOrigin('email'),
      });
      persistAuthSession(session);
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
    (input: {
      email: string;
      password: string;
      displayName: string;
      /** True only when the rendered marketing checkbox was ticked. */
      marketingConsent?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.register({
        role: 'employer',
        method: 'emailpass',
        ...data,
        ...developmentOrigin('email'),
      });
      persistAuthSession(session);
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
    const dataSource = getDataSource();
    const session = parseSessionForSource(
      getRequestHeader('cookie') ?? null,
      dataSource,
    );
    if (!session) return { ok: false as const };
    try {
      const next = await getSessionRefresher()(session);
      if (!next) {
        setResponseHeader('Set-Cookie', clearSessionForSource(dataSource));
        return { ok: false as const };
      }
      setResponseHeader(
        'Set-Cookie',
        serializeSessionForSource(next, dataSource),
      );
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
      waitUntil(
        getBoard()
          .auth.logout({ refreshToken: context.session.refreshToken })
          .catch(() => undefined),
      );
    }
    setResponseHeader(
      'Set-Cookie',
      clearSessionForSource(context.dataSource ?? getDataSource()),
    );
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
    await getBoard().auth.forgotPassword({
      ...data,
      ...developmentOrigin('email'),
    });
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

/** Confirm an email-change token from the verification email. No session. */
export const confirmEmailChange = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    try {
      await getBoard().me.confirmEmailChange(data);
      return { ok: true as const };
    } catch (error) {
      return authError(error);
    }
  });

export const requestMagicLink = createServerFn({ method: 'POST' })
  .validator(
    (input: { email: string; returnTo?: string; intent?: 'sign_in' }) => input,
  )
  .handler(async ({ data }) => {
    try {
      await getBoard().auth.requestMagicLink({
        ...data,
        ...developmentOrigin('email'),
      });
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
      persistAuthSession(session);
      return {
        ok: true as const,
        boardUser: session.boardUser,
        isNewUser: authExchangeIsNewUser(session),
      };
    } catch (error) {
      return authError(error);
    }
  });

export const getOAuthAuthorizationUrl = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      provider: 'google' | 'linkedin';
      returnTo?: string;
      /** Role the handshake creates for a NEW user; the API defaults to
       * `candidate`, so only the employer surfaces pass this. */
      role?: 'candidate' | 'employer';
    }) => input,
  )
  .handler(async ({ data }) => {
    try {
      const { provider, ...query } = data;
      const result = await getBoard().auth.getOAuthAuthorizationUrl(provider, {
        ...query,
        ...developmentOrigin('redirect'),
      });
      return { ok: true as const, authorizeUrl: result.authorizeUrl };
    } catch (error) {
      return authError(error);
    }
  });

/**
 * An SSO sign-in whose identity provider did not confirm the email lands on
 * the verification gate. The API sends no code for that sign-in, so send one
 * here, once per completed sign-in (the exchange token is single-use, so a
 * refresh of the verification page never re-sends). Also leave the hint that
 * lets the page say why an organization sign-in still asks for a code.
 */
async function startSsoEmailConfirmation(session: BoardAuthSession) {
  setCookie(SSO_EMAIL_UNCONFIRMED_COOKIE, session.boardUser.id, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SSO_EMAIL_UNCONFIRMED_MAX_AGE,
  });
  try {
    await getBoard().auth.resendVerification({
      headers: authHeaders(session.accessToken),
    });
  } catch (error) {
    // The session is already signed in; the page's "Resend code" retries.
    if (!isBoardApiError(error)) throw error;
  }
}

export const exchangeOAuth = createServerFn({ method: 'POST' })
  .validator((input: { token: string; method?: 'sso' }) => input)
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.exchangeOAuth({
        token: data.token,
      });
      persistAuthSession(session);
      if (data.method === 'sso' && !session.boardUser.emailVerified) {
        await startSsoEmailConfirmation(session);
      }
      return {
        ok: true as const,
        boardUser: session.boardUser,
        isNewUser: authExchangeIsNewUser(session),
      };
    } catch (error) {
      return authError(error);
    }
  });

/**
 * Start sign-in through one of the board's SSO connections (ids come from
 * the board context's `signIn.<role>.ssoConnections`). Returns the provider
 * URL; the browser navigates, and the round trip lands on
 * `/auth/oauth-complete`.
 */
export const getSsoAuthorizationUrl = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      connectionId: string;
      returnTo?: string;
      /** Role being signed into; also the role a NEW user is created as. */
      role?: 'candidate' | 'employer';
    }) => input,
  )
  .handler(async ({ data }) => {
    try {
      const { connectionId, ...query } = data;
      const result = await getBoard().auth.getSsoAuthorizationUrl(
        connectionId,
        { ...query, ...developmentOrigin('redirect') },
      );
      return { ok: true as const, authorizeUrl: result.authorizeUrl };
    } catch (error) {
      return authError(error);
    }
  });

/**
 * Finish an SSO sign-in that had to confirm the inbox first. The browser
 * sends the emailed `linkProof` token with the binding it kept when the
 * sign-in started; the session lands in the httpOnly cookie as usual.
 */
export const consumeSsoLinkProof = createServerFn({ method: 'POST' })
  .validator((input: { token: string; browserBinding?: string }) => input)
  .handler(async ({ data }) => {
    try {
      const session = await getBoard().auth.consumeSsoLinkProof(data);
      persistAuthSession(session);
      return {
        ok: true as const,
        boardUser: session.boardUser,
        isNewUser: authExchangeIsNewUser(session),
      };
    } catch (error) {
      return authError(error);
    }
  });
