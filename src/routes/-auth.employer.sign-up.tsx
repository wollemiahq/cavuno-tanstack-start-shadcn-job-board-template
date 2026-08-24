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
  signUpEmployerAction,
  invalidate,
  footer,
}: {
  boardName: string;
  signUpEmployerAction: (input: {
    data: {
      email: string;
      password: string;
      displayName: string;
      marketingConsent?: boolean;
    };
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
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
      successHref="/auth/verify-email-required?returnTo=%2Femployers%2Fdashboard"
      onSubmit={async (values) => {
        const result = await signUpEmployerAction({ data: values });
        if (result.ok) await invalidate();
        return result;
      }}
      footer={footer}
    />
  );
}
