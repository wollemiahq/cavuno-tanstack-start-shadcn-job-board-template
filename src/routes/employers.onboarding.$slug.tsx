import { createFileRoute, useRouter } from '@tanstack/react-router';

import { useRootSession } from '../components/root-session';
import { m } from '../paraglide/messages';
import { cancelClaim, sendWorkEmail } from '../server/employers';
import {
  EmployerOnboardingPageView,
  createEmployerOnboardingLoader,
} from './-employers.onboarding';

import { toastActionError } from '@/lib/action-toast';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/employers/onboarding/$slug')({
  loader: createEmployerOnboardingLoader(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerDashboard_metaTitle(),
        ),
      },
    ],
  }),
  staticData: { ownsMain: true },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { membership } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const router = useRouter();
  const { refreshSession } = useRootSession();
  return (
    <EmployerOnboardingPageView
      membership={membership}
      slug={slug}
      dependencies={{
        sendWorkEmail,
        cancelClaim,
        invalidate: async () => {
          await Promise.all([router.invalidate(), refreshSession()]);
        },
        navigateToDashboard: () =>
          router.navigate({ to: '/employers/dashboard' }),
        showActionError: toastActionError,
      }}
    />
  );
}
