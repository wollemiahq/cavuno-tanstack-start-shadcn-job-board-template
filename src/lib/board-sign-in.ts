import { isEmployerReturnPath } from './board-datalayer-events';

import type {
  AvailableSignInMethods,
  BoardRoleSignIn,
  BoardSignInSsoConnection,
  PublicBoardSignIn,
  SignInRole,
} from '@cavuno/board';

/**
 * Sign-in options per role from `board.context().signIn`. An API deployment
 * predating board SSO omits the block: every built-in method stays on and no
 * SSO connection is offered, which is exactly how the board behaved before.
 */
const ALL_BUILT_INS: BoardRoleSignIn = {
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

/** What a sign-in or sign-up card renders: built-in methods plus SSO buttons. */
export type SignInOptions = {
  methods: BoardRoleSignIn['methods'];
  ssoChoices: SsoChoice[];
};

/** The options `signIn.<role>` offers. */
export function roleSignInOptions(
  signIn: PublicBoardSignIn,
  role: SignInRole,
): SignInOptions {
  return {
    methods: signIn[role].methods,
    ssoChoices: signIn[role].ssoConnections.map((connection) => ({
      connection,
      role,
    })),
  };
}

/**
 * True when the options are SSO buttons only: every built-in method is off
 * and at least one connection is listed.
 */
export function isSsoOnly(options: SignInOptions): boolean {
  const { password, magicLink, google, linkedin } = options.methods;
  return (
    options.ssoChoices.length > 0 &&
    !password &&
    !magicLink &&
    !google &&
    !linkedin
  );
}

/**
 * The options to offer after the API refused a method with
 * `board_auth_method_unavailable`. `details.availableMethods` names what the
 * account's role can use: built-in method keys (unknown keys are ignored) and
 * SSO connection ids without a role. The account may belong to the role the
 * page is not for, so match each id against the page's role first and the
 * other role second.
 */
export function signInOptionsForAvailable(
  signIn: PublicBoardSignIn,
  role: SignInRole,
  available: AvailableSignInMethods,
): SignInOptions {
  const listed = new Set<string>(available.methods);
  const other: SignInRole = role === 'candidate' ? 'employer' : 'candidate';
  const ssoChoices: SsoChoice[] = [];
  for (const id of available.ssoConnectionIds) {
    if (ssoChoices.some((choice) => choice.connection.id === id)) continue;
    for (const from of [role, other]) {
      const connection = signIn[from].ssoConnections.find((c) => c.id === id);
      if (connection) {
        ssoChoices.push({ connection, role: from });
        break;
      }
    }
  }
  return {
    methods: {
      password: listed.has('password'),
      magicLink: listed.has('magicLink'),
      google: listed.has('google'),
      linkedin: listed.has('linkedin'),
    },
    ssoChoices,
  };
}
