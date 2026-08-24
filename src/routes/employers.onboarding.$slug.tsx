import { createFileRoute, useRouter } from '@tanstack/react-router';

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
  return (
    <EmployerOnboardingPageView
      membership={membership}
      slug={slug}
      dependencies={{
        sendWorkEmail,
        cancelClaim,
        invalidate: () => router.invalidate(),
        navigateToDashboard: () =>
          router.navigate({ to: '/employers/dashboard' }),
        showActionError: toastActionError,
      }}
    />
  );
}
