import { notFound } from '@tanstack/react-router';

import { redirectIfSignedIn, sessionUserOrNull } from '../lib/auth-guard';
import { MARKETING_CONSENT } from '../lib/marketing-consent';
import { m } from '../paraglide/messages';
import { getBoardContext } from '../server/queries';

import {
  RegistrationPage,
  type MarketingConsentCopy,
} from '@/components/registration-page';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { reconcileCommittedAction } from '@/lib/action-toast';
import {
  appendAuthIntentQuery,
  appendOAuthProviderHint,
} from '@/lib/board-datalayer-events';
import {
  buildVerifyEmailRedirectPath,
  verificationEmailReturnTo,
} from '@/lib/candidate-return-to';
import { employerDashboardHref } from '@/lib/employer-return-to';

/** Where an employer lands after the provider round trip, tagged for the
 * conversion datalayer the same way the candidate surfaces tag theirs. */
function employerOAuthReturnTo(
  dashboard: string,
  provider: 'google' | 'linkedin',
) {
  return appendOAuthProviderHint(
    appendAuthIntentQuery(dashboard, 'sign_up'),
    provider,
  );
}

export async function loadEmployerSignUp(
  actions: {
    getBoardContext: () => Promise<{
      name: string;
      features: { employers: boolean };
    }>;
    sessionUserOrNull: () => Promise<{
      id: string;
      role?: string;
      emailVerified?: boolean;
    } | null>;
  } = { getBoardContext, sessionUserOrNull },
) {
  const [user, board] = await Promise.all([
    actions.sessionUserOrNull(),
    actions.getBoardContext(),
  ]);
  if (user?.role === 'employer') {
    const destination = user.emailVerified
      ? '/employers/dashboard'
      : '/auth/verify-email-required?returnTo=%2Femployers%2Fdashboard';
    redirectIfSignedIn(user, destination);
  }
  redirectIfSignedIn(user, '/');
  if (!board.features.employers) throw notFound();
  return { boardName: board.name };
}

export function EmployerSignUpUnavailable() {
  return (
    <div>
      <Empty className="border-border bg-card border">
        <EmptyHeader>
          <EmptyDescription>
            {m.authEmployerSignUp_notAvailableText()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export function EmployerSignUpView({
  boardName,
  returnTo,
  signUpEmployerAction,
  getOAuthAuthorizationUrlAction,
  invalidate,
  footer,
}: {
  boardName: string;
  /**
   * Where the employer continues once their company is set up, such as Post
   * a job. Every path lands on the dashboard first: a new employer has no
   * company to post for until they create or claim one there.
   */
  returnTo?: string;
  signUpEmployerAction: (input: {
    data: {
      email: string;
      password: string;
      displayName: string;
      marketingConsent?: boolean;
      returnTo?: string;
    };
  }) => Promise<{ ok: true } | { ok: false; code?: string; message: string }>;
  getOAuthAuthorizationUrlAction: (input: {
    data: {
      provider: 'google' | 'linkedin';
      returnTo: string;
      role: 'employer';
    };
  }) => Promise<
    | { ok: true; authorizeUrl: string }
    | { ok: false; code?: string; message: string }
  >;
  invalidate: () => Promise<void>;
  footer?: React.ReactNode;
}) {
  const marketingConsent: MarketingConsentCopy | undefined =
    MARKETING_CONSENT.employerSignUp
      ? { disclosure: m.marketingConsent_signUpDisclosure() }
      : undefined;
  if (marketingConsent && MARKETING_CONSENT.privacyPolicyUrl) {
    marketingConsent.privacyPolicyUrl = MARKETING_CONSENT.privacyPolicyUrl;
    marketingConsent.privacyLinkLabel = m.marketingConsent_privacyLinkLabel();
  }
  const dashboard = employerDashboardHref(returnTo);

  return (
    <RegistrationPage
      title={m.authEmployerSignUp_cardTitle({ boardName })}
      supportingText={m.authEmployerSignUp_supportingText()}
      copy={{
        nameLabel: m.authEmployerSignUp_nameLabel(),
        emailLabel: m.authEmployerSignUp_workEmailLabel(),
        passwordLabel: m.authEmployerSignUp_passwordLabel(),
        submitLabel: m.authEmployerSignUp_submitLabel(),
        pendingLabel: m.authEmployerSignUp_creatingAccountLabel(),
        successTitle: m.authEmployerSignUp_checkEmailTitle(),
        successText: m.authEmployerSignUp_checkEmailBody(),
        successActionLabel: m.authEmployerSignUp_goToDashboardLabel(),
      }}
      marketingConsent={marketingConsent}
      successHref={buildVerifyEmailRedirectPath(dashboard)}
      onSubmit={async (values) => {
        // Without a destination the emailed link keeps the platform's
        // employer landing; with one it returns through the dashboard too.
        const result = await signUpEmployerAction({
          data: returnTo
            ? { ...values, returnTo: verificationEmailReturnTo(dashboard) }
            : values,
        });
        if (result.ok) await reconcileCommittedAction(invalidate);
        return result;
      }}
      // The role is fixed at authorize time and travels in the provider's
      // signed state: without it the handshake would mint a candidate who
      // could never reach the employer dashboard.
      onOAuthStart={(provider) =>
        getOAuthAuthorizationUrlAction({
          data: {
            provider,
            returnTo: employerOAuthReturnTo(dashboard, provider),
            role: 'employer',
          },
        })
      }
      footer={footer}
    />
  );
}
