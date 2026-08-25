import {
  candidateSignInHref,
  candidateVerifyEmailHref,
} from '../lib/candidate-return-to';
import { MARKETING_CONSENT } from '../lib/marketing-consent';
import { m } from '../paraglide/messages';

import {
  RegistrationPage,
  type MarketingConsentCopy,
} from '@/components/registration-page';
import { buttonVariants } from '@/components/ui/button';
import { reconcileCommittedAction } from '@/lib/action-toast';

export function SignUpView({
  boardName,
  returnTo,
  signUpAction,
  getOAuthAuthorizationUrlAction,
  invalidate,
}: {
  boardName: string;
  returnTo: string;
  signUpAction: (input: {
    data: {
      email: string;
      password: string;
      displayName: string;
      marketingConsent?: boolean;
    };
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
  getOAuthAuthorizationUrlAction: (input: {
    data: {
      provider: 'google' | 'linkedin';
      returnTo: string;
    };
  }) => Promise<
    { ok: true; authorizeUrl: string } | { ok: false; message: string }
  >;
  invalidate: () => Promise<void>;
}) {
  const marketingConsent: MarketingConsentCopy | undefined =
    MARKETING_CONSENT.candidateSignUp
      ? { disclosure: m.marketingConsent_signUpDisclosure() }
      : undefined;
  if (marketingConsent && MARKETING_CONSENT.privacyPolicyUrl) {
    marketingConsent.privacyPolicyUrl = MARKETING_CONSENT.privacyPolicyUrl;
    marketingConsent.privacyLinkLabel = m.marketingConsent_privacyLinkLabel();
  }

  return (
    <RegistrationPage
      title={m.authSignUp_title()}
      supportingText={m.authSignUp_supportingText({ boardName })}
      copy={{
        nameLabel: m.authSignUp_nameLabel(),
        emailLabel: m.authSignUp_emailLabel(),
        passwordLabel: m.authSignUp_passwordLabel(),
        submitLabel: m.authSignUp_submitLabel(),
        pendingLabel: m.authSignUp_creatingAccountLabel(),
        successTitle: m.authSignUp_checkEmailTitle(),
        successText: m.authSignUp_checkEmailBody(),
        successActionLabel: m.authSignUp_goToAccountLabel(),
      }}
      marketingConsent={marketingConsent}
      successHref={candidateVerifyEmailHref(returnTo)}
      onSubmit={async (values) => {
        const result = await signUpAction({ data: values });
        if (result.ok) await reconcileCommittedAction(invalidate);
        return result;
      }}
      onOAuthStart={(provider) =>
        getOAuthAuthorizationUrlAction({ data: { provider, returnTo } })
      }
      footer={
        <p className="text-muted-foreground text-center text-sm">
          {m.authSignUp_alreadyHaveAccountText()}{' '}
          <a
            href={candidateSignInHref(returnTo)}
            className={buttonVariants({ variant: 'link', size: 'sm' })}
          >
            {m.authSignUp_signInLink()}
          </a>
        </p>
      }
    />
  );
}
