import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router';

import { redirectIfSignedIn, sessionUserOrNull } from '../lib/auth-guard';
import { MARKETING_CONSENT } from '../lib/marketing-consent';
import { m } from '../paraglide/messages';
import { signUpEmployer } from '../server/auth';
import { getBoardContext } from '../server/queries';

import { RegistrationPage } from '@/components/registration-page';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/auth/employer/sign-up')({
  loader: async () => {
    const [user, board] = await Promise.all([
      sessionUserOrNull(),
      getBoardContext(),
    ]);
    redirectIfSignedIn(user, '/');
    if (!board.features.employers) throw notFound();
    return { boardName: board.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authEmployerSignUp_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: EmployerSignUpPage,
  notFoundComponent: () => (
    <div>
      <Empty className="border-border bg-card border">
        <EmptyHeader>
          <EmptyDescription>
            {m.authEmployerSignUp_notAvailableText()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  ),
});

function EmployerSignUpPage() {
  const router = useRouter();
  const { boardName } = Route.useLoaderData();

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
      marketingConsent={
        MARKETING_CONSENT.employerSignUp
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
      successHref="/employers/dashboard"
      onSubmit={async (values) => {
        const result = await signUpEmployer({ data: values });
        if (result.ok) await router.invalidate();
        return result;
      }}
      footer={
        <p className="text-muted-foreground text-center text-sm">
          {m.authEmployerSignUp_lookingForWorkText()}{' '}
          <Link
            to="/auth/sign-up"
            search={{ returnTo: undefined }}
            className={buttonVariants({ variant: 'link', size: 'sm' })}
          >
            {m.authEmployerSignUp_joinAsCandidateLink()}
          </Link>
        </p>
      }
    />
  );
}
