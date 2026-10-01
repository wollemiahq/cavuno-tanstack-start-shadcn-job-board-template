import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router';

import { ResumeUpload } from '../components/resume-upload';
import { useRootSession } from '../components/root-session';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { resendOtp, verifyOtpCode } from '../server/auth';
import { getFreshBoardContext } from '../server/queries';
import { updateNotificationPreference } from '../server/settings';
import {
  loadVerificationGate,
  VerifyEmailRequiredView,
} from './-auth.verify-email-required';

import {
  toastActionError,
  toastActionReconciliationError,
} from '@/lib/action-toast';
import { pickAuthConversionSearch } from '@/lib/board-datalayer-events';
import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';

const rootApi = getRouteApi('__root__');

export function resolveVerifiedDestination(
  returnTo: string,
  jobRecommendationsEnabled: boolean,
): string {
  if (jobRecommendationsEnabled) return returnTo;
  const pathname = returnTo.split(/[?#]/, 1)[0] ?? returnTo;
  if (pathname === '/matches') return '/account';
  const localizedMatch = pathname.match(/^\/([^/]+)\/matches$/);
  return localizedMatch ? `/${localizedMatch[1]}/account` : returnTo;
}

export function isJobMatchesDestination(returnTo: string): boolean {
  const pathname = returnTo.split(/[?#]/, 1)[0] ?? returnTo;
  return pathname === '/matches' || /^\/[^/]+\/matches$/.test(pathname);
}

/**
 * Builds the view's `invalidate`. After a successful code (no `sync`) the
 * root session still holds `emailVerified: false`, so it is re-read alongside
 * the loaders; otherwise save gates and the messages dock stay stale. A failed
 * code (`sync`) only reconciles lockout state and must not report a refresh
 * failure over the typed error.
 */
export function verifyEmailInvalidate(
  invalidateRouter: (options?: { sync: true }) => Promise<void>,
  refreshSession: () => Promise<void>,
): (sync?: boolean) => Promise<void> {
  return async (sync) => {
    if (sync) {
      await invalidateRouter({ sync: true });
      return;
    }
    await Promise.all([invalidateRouter(), refreshSession()]);
  };
}

export const Route = createFileRoute('/auth/verify-email-required')({
  validateSearch: (search: UrlSearchInput) => ({
    returnTo: candidateReturnTo(search.returnTo),
    ...pickAuthConversionSearch(search),
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
  const { refreshSession } = useRootSession();
  const search = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const { emailVerified, role, resume, resumeOnboardingDismissed, userId } =
    Route.useLoaderData();
  const returnTo = candidateReturnTo(search.returnTo);
  const jobRecommendationsEnabled =
    board.features.jobRecommendationsEnabled ?? true;
  return (
    <VerifyEmailRequiredView
      emailVerified={emailVerified}
      role={role}
      resume={resume}
      resumeOnboardingDismissed={resumeOnboardingDismissed}
      userId={userId}
      returnTo={returnTo}
      jobRecommendationsEnabled={jobRecommendationsEnabled}
      verifyOtpCodeAction={verifyOtpCode}
      resendOtpAction={resendOtp}
      updateNotificationPreferenceAction={async (input) => {
        await updateNotificationPreference(input);
      }}
      invalidate={verifyEmailInvalidate(
        (options) => router.invalidate(options),
        refreshSession,
      )}
      navigate={async (href) => {
        let recommendationsEnabled = jobRecommendationsEnabled;
        if (isJobMatchesDestination(href)) {
          try {
            const currentBoard = await getFreshBoardContext();
            recommendationsEnabled =
              currentBoard.features.jobRecommendationsEnabled ?? true;
          } catch {
            // Keep the last known shell value when the freshness check fails;
            // the destination loader remains the final server-side gate.
          }
        }
        await router.navigate({
          href: resolveVerifiedDestination(href, recommendationsEnabled),
        });
      }}
      reportActionError={toastActionError}
      reportReconciliationError={toastActionReconciliationError}
      renderResumeUpload={(currentResume, onStored) => (
        <ResumeUpload
          resume={currentResume}
          variant="embedded"
          showKeepOnFile={false}
          onStored={onStored}
        />
      )}
    />
  );
}
