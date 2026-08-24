import { createFileRoute, useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  createCompanyInvite,
  leaveCompany,
  removeCompanyMember,
  revokeCompanyInvite,
  updateCompanyMemberRole,
} from '../server/employers';
import {
  CompanyMembersPageView,
  createCompanyMembersLoader,
} from './-employers.company-members';

import { toastActionError, toastActionSuccess } from '@/lib/action-toast';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/employers/companies/$slug/members')({
  loader: createCompanyMembersLoader(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(loaderData?.seo.boardName, m.employerMembers_title()),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  staticData: { ownsMain: true },
  component: CompanyMembersPage,
});

function CompanyMembersPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  return (
    <CompanyMembersPageView
      data={data}
      actions={{
        createCompanyInvite,
        leaveCompany,
        removeCompanyMember,
        revokeCompanyInvite,
        updateCompanyMemberRole,
        invalidate: () => router.invalidate(),
        navigateToDashboard: () =>
          router.navigate({ to: '/employers/dashboard' }),
        navigateToMembers: (slug) =>
          router.navigate({
            to: '/employers/companies/$slug/members',
            params: { slug },
            replace: true,
          }),
        toastError: (message) => void toastActionError(message),
        toastSuccess: (message) => void toastActionSuccess(message),
      }}
    />
  );
}
