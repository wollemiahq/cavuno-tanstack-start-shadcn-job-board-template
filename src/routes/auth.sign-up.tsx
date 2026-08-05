import { createFileRoute, useRouter } from '@tanstack/react-router';

import { redirectIfAuthenticated } from '../lib/auth-guard';
import {
  candidateReturnTo,
  candidateSignInHref,
  candidateVerifyEmailHref,
} from '../lib/candidate-return-to';
import { MARKETING_CONSENT } from '../lib/marketing-consent';
import { m } from '../paraglide/messages';
import { signUp } from '../server/auth';
import { getBoardContext } from '../server/queries';

import { RegistrationPage } from '@/components/registration-page';
import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/auth/sign-up')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo:
      typeof search.returnTo === 'string' && search.returnTo
        ? candidateReturnTo(search.returnTo)
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ returnTo: search.returnTo }),
  loader: async ({ deps }) => {
    await redirectIfAuthenticated(candidateReturnTo(deps.returnTo));
    const board = await getBoardContext();
    return { boardName: board.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authSignUp_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  const { boardName } = Route.useLoaderData();
  const search = Route.useSearch();
  const returnTo = candidateReturnTo(search.returnTo);

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
      marketingConsent={
        MARKETING_CONSENT.candidateSignUp
          ? {
              disclosure: m.marketingConsent_signUpDisclosure(),
              ...(MARKETING_CONSENT.privacyPolicyUrl
                ? {
                    privacyPolicyUrl: MARKETING_CONSENT.privacyPolicyUrl,
                    privacyLinkLabel: m.marketingConsent_privacyLinkLabel(),
                  }
                : {}),
            }
          : undefined
      }
      successHref={candidateVerifyEmailHref(returnTo)}
      onSubmit={async (values) => {
        const result = await signUp({ data: values });
        if (result.ok) await router.invalidate();
        return result;
      }}
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
