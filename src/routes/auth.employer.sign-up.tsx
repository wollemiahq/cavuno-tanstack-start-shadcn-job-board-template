import { createFileRoute, Link, useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { signUpEmployer } from '../server/auth';
import {
  EmployerSignUpUnavailable,
  EmployerSignUpView,
  loadEmployerSignUp,
} from './-auth.employer.sign-up';

import { headTitle } from '@/lib/page-title';
import { textLinkClass } from '@/lib/text-link';

export const Route = createFileRoute('/auth/employer/sign-up')({
  loader: () => loadEmployerSignUp(),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authEmployerSignUp_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: EmployerSignUpPage,
  notFoundComponent: EmployerSignUpUnavailable,
});

function EmployerSignUpPage() {
  const router = useRouter();
  const { boardName } = Route.useLoaderData();
  return (
    <EmployerSignUpView
      boardName={boardName}
      signUpEmployerAction={signUpEmployer}
      invalidate={async () => {
        await router.invalidate();
      }}
      footer={
        <p className="text-muted-foreground text-center text-sm">
          {m.authEmployerSignUp_lookingForWorkText()}{' '}
          <Link to="/auth/sign-up" className={textLinkClass}>
            {m.authEmployerSignUp_joinAsCandidateLink()}
          </Link>
        </p>
      }
    />
  );
}
