import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router';

import { ResumeUpload } from '../components/resume-upload';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { resendOtp, verifyOtpCode } from '../server/auth';
import { updateNotificationPreference } from '../server/settings';
import {
  loadVerificationGate,
  VerifyEmailRequiredView,
} from './-auth.verify-email-required';

import {
  toastActionError,
  toastActionReconciliationError,
} from '@/lib/action-toast';
import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';

const rootApi = getRouteApi('__root__');

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
  const { board } = rootApi.useLoaderData();
  const { emailVerified, role, resume, resumeOnboardingDismissed, userId } =
    Route.useLoaderData();
  const returnTo = candidateReturnTo(search.returnTo);
  return (
    <VerifyEmailRequiredView
      emailVerified={emailVerified}
      role={role}
      resume={resume}
      resumeOnboardingDismissed={resumeOnboardingDismissed}
      userId={userId}
      returnTo={returnTo}
      jobRecommendationsEnabled={
        board.features.jobRecommendationsEnabled ?? true
      }
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
      reportReconciliationError={toastActionReconciliationError}
      renderResumeUpload={(currentResume) => (
        <ResumeUpload
          resume={currentResume}
          variant="embedded"
          showKeepOnFile={false}
        />
      )}
    />
  );
}
