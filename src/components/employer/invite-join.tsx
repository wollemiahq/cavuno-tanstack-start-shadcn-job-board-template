/**
 * The "Join <company>" page behind a company member invite link
 * (`/employers/invites/accept?token=…`). Presentation only: the route loader
 * decides the state (see `routes/-employers.invites.accept.tsx`) and passes
 * the auth/accept actions in, so every state renders and submits in tests
 * without a server.
 */
import { useState } from 'react';

import { Link } from '@tanstack/react-router';
import { Info, LockIcon, TriangleAlert } from 'lucide-react';

import { m } from '../../paraglide/messages';
import {
  AuthCard,
  AuthDivider,
  Field,
  FormError,
  OAuthProviderButtons,
  SignInMethodTabs,
  type SignInMethod,
} from '../auth-form';

import { AuthMailAppLinks } from '@/components/mail-app-links';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Field as FormField,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import {
  appendAuthConversionQuery,
  appendAuthIntentQuery,
  appendOAuthProviderHint,
} from '@/lib/board-datalayer-events';
import { boardErrorMessage } from '@/lib/board-error-message';
import { candidateAuthSearch } from '@/lib/candidate-return-to';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { initialsOf } from '@/lib/initials';
import { localizePath } from '@/lib/localized-path';
import { textActionClass, textLinkClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';

export type InviteCompany = {
  slug: string;
  name: string;
  logoUrl: string | null;
};

/** What the join page shows for one invite link. */
export type InviteJoinState =
  /** Signed out, invite pending, no account for the invited email yet. */
  | { mode: 'create-account'; company: InviteCompany; email: string }
  /** Signed out, invite pending, the invited email already has an employer account. */
  | { mode: 'sign-in'; company: InviteCompany; email: string }
  /** Signed in as someone other than the invited email. */
  | {
      mode: 'wrong-account';
      company: InviteCompany | null;
      email: string | null;
      signedInAs: { email: string; displayName: string | null } | null;
    }
  /** Expired, revoked, already used, or unknown token. */
  | {
      mode: 'unavailable';
      reason: 'expired' | 'invalid';
      company: InviteCompany | null;
    }
  /** The invited email belongs to a job-seeker account. */
  | { mode: 'candidate'; company: InviteCompany | null; email: string | null };

type ActionFailure = { ok: false; code?: string; message: string };

export type InviteJoinActions = {
  signUp: (input: {
    data: {
      email: string;
      password: string;
      displayName: string;
      inviteToken: string;
      returnTo?: string;
    };
  }) => Promise<{ ok: true } | ActionFailure>;
  signIn: (input: {
    data: { email: string; password: string };
  }) => Promise<{ ok: true } | ActionFailure>;
  requestMagicLink: (input: {
    data: { email: string; returnTo?: string; intent?: 'sign_in' };
  }) => Promise<{ ok: true } | ActionFailure>;
  getOAuthAuthorizationUrl: (input: {
    data: {
      provider: 'google' | 'linkedin';
      returnTo: string;
      role: 'employer';
    };
  }) => Promise<{ ok: true; authorizeUrl: string } | ActionFailure>;
  acceptInvite: (input: {
    data: { token: string };
  }) => Promise<{ ok: true; data: { companySlug: string } } | ActionFailure>;
  signOut: () => Promise<{ ok: true }>;
  assignLocation: (url: string) => void;
};

export type InviteJoinBoard = {
  name: string;
  logoUrl: string | null;
  /** Whether the board's /contact page is live. */
  contactEnabled: boolean;
};

/** The accept page for one token — every auth round trip returns here. */
export function inviteAcceptPath(token: string) {
  return token
    ? `/employers/invites/accept?token=${encodeURIComponent(token)}`
    : '/employers/invites/accept';
}

/** The company workspace, flagged so it greets the new member once. */
export function joinedCompanyPath(companySlug: string) {
  return `/employers/companies/${encodeURIComponent(companySlug)}?joined=1`;
}

/**
 * Company logo (initials tile when there is none) with the board's logo as a
 * small badge on its bottom-right corner. Decorative: the heading names the
 * company.
 */
export function InviteCompanyMark({
  company,
  board,
  muted = false,
}: {
  company: InviteCompany;
  board: InviteJoinBoard;
  muted?: boolean;
}) {
  const companyInitials = initialsOf(company.name);
  const boardInitials = initialsOf(board.name);
  return (
    <div
      aria-hidden
      data-test="invite-company-mark"
      className={cn('relative', muted && 'opacity-60 grayscale')}
    >
      <div className="bg-muted text-foreground border-border flex size-14 items-center justify-center overflow-hidden rounded-2xl border text-lg font-semibold shadow-sm">
        {company.logoUrl ? (
          <img
            src={company.logoUrl}
            alt=""
            width={56}
            height={56}
            className="size-full object-cover"
            onError={hideBrokenImage}
          />
        ) : (
          (companyInitials ?? null)
        )}
      </div>
      <div className="bg-primary text-primary-foreground ring-card absolute -end-1.5 -bottom-1.5 flex size-6 items-center justify-center overflow-hidden rounded-lg text-xs font-semibold ring-2">
        {board.logoUrl ? (
          <img
            src={board.logoUrl}
            alt=""
            width={24}
            height={24}
            className="size-full object-cover"
            onError={hideBrokenImage}
          />
        ) : (
          (boardInitials?.slice(0, 1) ?? null)
        )}
      </div>
    </div>
  );
}

export function InviteJoinView({
  state,
  token,
  board,
  actions,
}: {
  state: InviteJoinState;
  token: string;
  board: InviteJoinBoard;
  actions: InviteJoinActions;
}) {
  // A signed-out invitee can switch from "create account" to "sign in"; the
  // reverse is never offered once the API says the account exists.
  const [signInChosen, setSignInChosen] = useState(false);

  switch (state.mode) {
    case 'create-account':
      return signInChosen ? (
        <InviteSignInCard
          company={state.company}
          email={state.email}
          token={token}
          board={board}
          actions={actions}
        />
      ) : (
        <InviteCreateAccountCard
          company={state.company}
          email={state.email}
          token={token}
          board={board}
          actions={actions}
          onSignIn={() => setSignInChosen(true)}
        />
      );
    case 'sign-in':
      return (
        <InviteSignInCard
          company={state.company}
          email={state.email}
          token={token}
          board={board}
          actions={actions}
        />
      );
    case 'wrong-account':
      return (
        <InviteWrongAccountCard
          state={state}
          token={token}
          board={board}
          actions={actions}
        />
      );
    case 'candidate':
      return <InviteCandidateCard state={state} board={board} />;
    case 'unavailable':
      return <InviteUnavailableCard state={state} board={board} />;
  }
}

/** After a sign-up or sign-in commits: join, then open the company. */
async function acceptAndOpenCompany(
  actions: InviteJoinActions,
  token: string,
  event: 'sign_up' | 'login',
) {
  let result: Awaited<ReturnType<InviteJoinActions['acceptInvite']>> | null;
  try {
    result = await actions.acceptInvite({ data: { token } });
  } catch {
    result = null;
  }
  // Any refusal is the accept page's to explain: reload it with the new
  // session and it renders the matching state.
  const destination = result?.ok
    ? joinedCompanyPath(result.data.companySlug)
    : inviteAcceptPath(token);
  actions.assignLocation(
    localizePath(appendAuthConversionQuery(destination, event, 'password')),
  );
}

function useOAuthStart(
  actions: InviteJoinActions,
  token: string,
  intent: 'sign_up' | 'login',
  setPending: (pending: boolean) => void,
  setError: (error: string | null) => void,
) {
  return async (provider: 'google' | 'linkedin') => {
    setPending(true);
    setError(null);
    try {
      // A provider that returns a different email lands back here signed in
      // as that address, which the page answers with the wrong-account state.
      const result = await actions.getOAuthAuthorizationUrl({
        data: {
          provider,
          returnTo: localizePath(
            appendOAuthProviderHint(
              appendAuthIntentQuery(inviteAcceptPath(token), intent),
              provider,
            ),
          ),
          role: 'employer',
        },
      });
      if (result.ok) {
        actions.assignLocation(result.authorizeUrl);
        return;
      }
      setError(boardErrorMessage(result));
    } catch {
      setError(m.candidateAction_errorText());
    }
    setPending(false);
  };
}

function LockedEmailField({ email }: { email: string }) {
  return (
    <FormField>
      <FieldLabel htmlFor="email">
        {m.employerInviteJoin_emailLabel()}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          readOnly
          aria-describedby="invite-email-hint"
        />
        <InputGroupAddon align="inline-end">
          <LockIcon aria-hidden />
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription id="invite-email-hint">
        {m.employerInviteJoin_emailLockedHint()}
      </FieldDescription>
    </FormField>
  );
}

function InviteCreateAccountCard({
  company,
  email,
  token,
  board,
  actions,
  onSignIn,
}: {
  company: InviteCompany;
  email: string;
  token: string;
  board: InviteJoinBoard;
  actions: InviteJoinActions;
  onSignIn: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startOAuth = useOAuthStart(
    actions,
    token,
    'sign_up',
    setPending,
    setError,
  );

  return (
    <AuthCard
      title={m.employerInviteJoin_joinTitle({ company: company.name })}
      supportingText={m.employerInviteJoin_joinBody({
        board: board.name,
        company: company.name,
      })}
      mark={<InviteCompanyMark company={company} board={board} />}
    >
      <form
        method="post"
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            const result = await actions.signUp({
              data: {
                email,
                password: String(form.get('password')),
                displayName: String(form.get('displayName')),
                inviteToken: token,
                returnTo: localizePath(inviteAcceptPath(token)),
              },
            });
            if (!result.ok) {
              setError(boardErrorMessage(result));
              setPending(false);
              return;
            }
          } catch {
            setError(m.candidateAction_errorText());
            setPending(false);
            return;
          }
          await acceptAndOpenCompany(actions, token, 'sign_up');
        }}
      >
        <LockedEmailField email={email} />
        <Field
          label={m.employerInviteJoin_nameLabel()}
          name="displayName"
          autoComplete="name"
        />
        <Field
          label={m.employerInviteJoin_passwordLabel()}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? m.employerInviteJoin_creatingLabel()
            : m.employerInviteJoin_createSubmitLabel()}
        </Button>
      </form>

      <AuthDivider label={m.authOrDividerLabel()} />
      <OAuthProviderButtons
        disabled={pending}
        onStart={(provider) => void startOAuth(provider)}
      />

      <p className="text-muted-foreground text-center text-sm">
        {m.employerInviteJoin_haveAccountText()}{' '}
        <button type="button" className={textActionClass} onClick={onSignIn}>
          {m.employerInviteJoin_signInLink()}
        </button>
      </p>
    </AuthCard>
  );
}

function InviteSignInCard({
  company,
  email,
  token,
  board,
  actions,
}: {
  company: InviteCompany;
  email: string;
  token: string;
  board: InviteJoinBoard;
  actions: InviteJoinActions;
}) {
  const [mode, setMode] = useState<SignInMethod>('password');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const acceptPath = inviteAcceptPath(token);
  const startOAuth = useOAuthStart(
    actions,
    token,
    'login',
    setPending,
    setError,
  );
  const mark = <InviteCompanyMark company={company} board={board} />;

  async function sendMagicLink() {
    return actions.requestMagicLink({
      data: { email, returnTo: localizePath(acceptPath), intent: 'sign_in' },
    });
  }

  if (linkSent) {
    return (
      <AuthCard
        title={m.authSignIn_magicLinkSentTitle()}
        supportingText={m.authSignIn_magicLinkSentBody({ email })}
        mark={mark}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <button
            type="button"
            className={textActionClass}
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                const result = await sendMagicLink();
                if (!result.ok) setError(boardErrorMessage(result));
              } catch {
                setError(m.candidateAction_errorText());
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? m.authSignIn_sendingLabel() : m.authSignIn_resendLabel()}
          </button>
        </div>
        <AuthMailAppLinks />
        <FormError message={error} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={m.employerInviteJoin_signInTitle({ company: company.name })}
      supportingText={m.employerInviteJoin_signInBody({ board: board.name })}
      mark={mark}
    >
      <SignInMethodTabs
        value={mode}
        onValueChange={(next) => {
          setMode(next);
          setError(null);
        }}
        ariaLabel={m.employerInviteJoin_signInTitle({ company: company.name })}
      />
      <form
        method="post"
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            if (mode === 'magic') {
              const sent = await sendMagicLink();
              if (sent.ok) setLinkSent(true);
              else setError(boardErrorMessage(sent));
              setPending(false);
              return;
            }
            const result = await actions.signIn({
              data: { email, password: String(form.get('password')) },
            });
            if (!result.ok) {
              setError(boardErrorMessage(result));
              setPending(false);
              return;
            }
          } catch {
            setError(m.candidateAction_errorText());
            setPending(false);
            return;
          }
          await acceptAndOpenCompany(actions, token, 'login');
        }}
      >
        <LockedEmailField email={email} />
        {mode === 'password' ? (
          <Field
            label={m.authSignIn_passwordLabel()}
            name="password"
            type="password"
            autoComplete="current-password"
            labelAction={
              <Link
                className={textLinkClass}
                to="/auth/forgot-password"
                search={candidateAuthSearch(acceptPath)}
              >
                {m.authSignIn_forgotPasswordLink()}
              </Link>
            }
          />
        ) : null}
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? mode === 'password'
              ? m.authSignIn_signingInLabel()
              : m.authSignIn_sendingLabel()
            : mode === 'password'
              ? m.employerInviteJoin_signInSubmitLabel()
              : m.authSignIn_sendMagicLinkLabel()}
        </Button>
      </form>

      <AuthDivider label={m.authOrDividerLabel()} />
      <OAuthProviderButtons
        disabled={pending}
        onStart={(provider) => void startOAuth(provider)}
      />

      <p className="text-muted-foreground text-center text-sm">
        <Link
          className={textLinkClass}
          to="/auth/sign-in"
          search={candidateAuthSearch(acceptPath)}
        >
          {m.employerInviteJoin_differentAccountLink()}
        </Link>
      </p>
    </AuthCard>
  );
}

function InviteWrongAccountCard({
  state,
  token,
  board,
  actions,
}: {
  state: Extract<InviteJoinState, { mode: 'wrong-account' }>;
  token: string;
  board: InviteJoinBoard;
  actions: InviteJoinActions;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyName = state.company?.name ?? board.name;

  return (
    <AuthCard
      title={m.employerInviteJoin_wrongAccountTitle()}
      supportingText={
        state.email
          ? m.employerInviteJoin_wrongAccountBody({
              company: companyName,
              email: state.email,
            })
          : m.employerInviteJoin_wrongAccountBodyNoEmail({
              company: companyName,
            })
      }
      mark={
        state.company ? (
          <InviteCompanyMark company={state.company} board={board} />
        ) : undefined
      }
    >
      {state.signedInAs ? (
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemDescription>
              {m.employerInviteJoin_signedInAsLabel()}
            </ItemDescription>
            <ItemTitle>
              {state.signedInAs.displayName ?? state.signedInAs.email}
            </ItemTitle>
            {state.signedInAs.displayName ? (
              <ItemDescription>{state.signedInAs.email}</ItemDescription>
            ) : null}
          </ItemContent>
        </Item>
      ) : null}
      <div className="grid gap-3">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              await actions.signOut();
            } catch {
              setError(m.candidateAction_errorText());
              setPending(false);
              return;
            }
            // Signed out, the page offers sign-up or sign-in for the invite.
            actions.assignLocation(localizePath(inviteAcceptPath(token)));
          }}
        >
          {state.email
            ? m.employerInviteJoin_signOutAndUseLabel({ email: state.email })
            : m.employerInviteJoin_signOutLabel()}
        </Button>
        <Link
          to="/employers/dashboard"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
        >
          {m.employerInviteJoin_keepSignedInLabel()}
        </Link>
        <FormError message={error} />
      </div>
    </AuthCard>
  );
}

function ContactBoardLink({ board }: { board: InviteJoinBoard }) {
  if (!board.contactEnabled) return null;
  return (
    <Link
      to="/contact"
      className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
    >
      {m.employerInviteJoin_contactBoardLabel({ board: board.name })}
    </Link>
  );
}

function InviteUnavailableCard({
  state,
  board,
}: {
  state: Extract<InviteJoinState, { mode: 'unavailable' }>;
  board: InviteJoinBoard;
}) {
  return (
    <AuthCard
      title={
        state.reason === 'expired'
          ? m.employerInviteJoin_expiredTitle()
          : m.employerInviteJoin_invalidTitle()
      }
      supportingText={m.employerInviteJoin_unavailableBody()}
      mark={
        state.company ? (
          <InviteCompanyMark company={state.company} board={board} muted />
        ) : undefined
      }
    >
      <Alert>
        <Info aria-hidden />
        <AlertDescription>
          {m.employerInviteJoin_unavailableHint()}
        </AlertDescription>
      </Alert>
      <ContactBoardLink board={board} />
    </AuthCard>
  );
}

function InviteCandidateCard({
  state,
  board,
}: {
  state: Extract<InviteJoinState, { mode: 'candidate' }>;
  board: InviteJoinBoard;
}) {
  return (
    <AuthCard
      title={m.employerInviteJoin_candidateTitle()}
      supportingText={
        state.email
          ? m.employerInviteJoin_candidateBody({
              email: state.email,
              board: board.name,
            })
          : m.employerInviteJoin_candidateBodyNoEmail({ board: board.name })
      }
      mark={
        state.company ? (
          <InviteCompanyMark company={state.company} board={board} />
        ) : undefined
      }
    >
      <Alert>
        <TriangleAlert aria-hidden />
        <AlertDescription>
          {m.employerInviteJoin_candidateHint({ board: board.name })}
        </AlertDescription>
      </Alert>
      <ContactBoardLink board={board} />
    </AuthCard>
  );
}
