import { createFileRoute, useRouter } from '@tanstack/react-router';

import { ResumeUpload } from '../components/resume-upload';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { resendOtp, verifyOtpCode } from '../server/auth';
import { updateNotificationPreference } from '../server/settings';
import {
  loadVerificationGate,
  VerifyEmailRequiredView,
} from './-auth.verify-email-required';

import { toastActionError } from '@/lib/action-toast';
import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/auth/verify-email-required')({
  validateSearch: (search: UrlSearchInput) => ({
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => ({
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loader: ({ deps }) => loadVerificationGate(deps),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.authVerifyEmailRequired_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: VerifyEmailRequiredPage,
});

function VerifyEmailRequiredPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const { emailVerified, role, resume } = Route.useLoaderData();
  const returnTo = candidateReturnTo(search.returnTo);
  return (
    <VerifyEmailRequiredView
      emailVerified={emailVerified}
      role={role}
      resume={resume}
      returnTo={returnTo}
      verifyOtpCodeAction={verifyOtpCode}
      resendOtpAction={resendOtp}
      updateNotificationPreferenceAction={async (input) => {
        await updateNotificationPreference(input);
      }}
      invalidate={async (sync) => {
        await router.invalidate(sync ? { sync: true } : undefined);
      }}
      navigate={async (href) => {
        await router.navigate({ href });
      }}
      reportActionError={toastActionError}
      renderResumeUpload={(currentResume) => (
        <ResumeUpload resume={currentResume} />
      )}
    />
  );
}
