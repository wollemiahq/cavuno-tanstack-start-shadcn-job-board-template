import type {
  BoardRoleSignIn,
  BoardSignInSsoConnection,
  PublicBoardSignIn,
  SignInRole,
} from '@cavuno/board';

import { isEmployerReturnPath } from './board-datalayer-events';

/**
 * Sign-in options per role from `board.context().signIn`. An API deployment
 * predating board SSO omits the block: every built-in method stays on and no
 * SSO connection is offered, which is exactly how the board behaved before.
 */
const ALL_BUILT_INS: BoardRoleSignIn = {
  ssoRequired: false,
  methods: { password: true, magicLink: true, google: true, linkedin: true },
  ssoConnections: [],
};

export function resolveBoardSignIn(
  signIn: PublicBoardSignIn | null | undefined,
): PublicBoardSignIn {
  return {
    candidate: signIn?.candidate ?? ALL_BUILT_INS,
    employer: signIn?.employer ?? ALL_BUILT_INS,
  };
}

/**
 * The role a shared sign-in page signs into. Employer surfaces bounce to
 * `/auth/sign-in?returnTo=/employers/…`, so the destination names the role;
 * everything else is a candidate destination.
 */
export function signInRoleForReturnTo(returnTo: string): SignInRole {
  const pathname = new URL(returnTo, 'https://example.com').pathname;
  return isEmployerReturnPath(pathname) ? 'employer' : 'candidate';
}

export type SsoChoice = {
  connection: BoardSignInSsoConnection;
  /** The role the connection is offered to; SSO starts for this role. */
  role: SignInRole;
};

/**
 * SSO connections to offer after the API answered `sso_required`. The error
 * lists connection ids without a role, so match them against the page's role
 * first and the other role second. Without ids (a `?error=sso_required`
 * redirect), offer the page role's connections, or the other role's when the
 * page role has none.
 */
export function ssoChoicesForRequired(
  signIn: PublicBoardSignIn,
  role: SignInRole,
  connectionIds?: readonly string[],
): SsoChoice[] {
  const other: SignInRole = role === 'candidate' ? 'employer' : 'candidate';
  const offered = (from: SignInRole) =>
    signIn[from].ssoConnections.map((connection) => ({
      connection,
      role: from,
    }));
  if (!connectionIds || connectionIds.length === 0) {
    const own = offered(role);
    return own.length > 0 ? own : offered(other);
  }
  const choices: SsoChoice[] = [];
  for (const id of connectionIds) {
    const match =
      offered(role).find((choice) => choice.connection.id === id) ??
      offered(other).find((choice) => choice.connection.id === id);
    if (match && !choices.some((choice) => choice.connection.id === id)) {
      choices.push(match);
    }
  }
  return choices;
}
