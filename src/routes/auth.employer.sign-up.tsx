import { createFileRoute, Link, useRouter } from '@tanstack/react-router';

import { employerReturnTo } from '../lib/employer-return-to';
import { m } from '../paraglide/messages';
import { getOAuthAuthorizationUrl, signUpEmployer } from '../server/auth';
import {
  EmployerSignUpUnavailable,
  EmployerSignUpView,
  loadEmployerSignUp,
} from './-auth.employer.sign-up';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
import { textLinkClass } from '@/lib/text-link';

export const Route = createFileRoute('/auth/employer/sign-up')({
  // Omitted rather than `undefined` when absent, so links stay a clean URL.
  validateSearch: (search: UrlSearchInput): { returnTo?: string } => {
    const returnTo = employerReturnTo(searchString(search.returnTo));
    return returnTo ? { returnTo } : {};
  },
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
  const { returnTo } = Route.useSearch();
  return (
    <EmployerSignUpView
      boardName={boardName}
      returnTo={returnTo}
      signUpEmployerAction={signUpEmployer}
      getOAuthAuthorizationUrlAction={getOAuthAuthorizationUrl}
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
