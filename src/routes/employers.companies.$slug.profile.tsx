import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  deleteCompany,
  updateCompany,
  uploadCompanyLogo,
} from '../server/employers';
import {
  CompanyProfilePageView,
  createCompanyProfileLoader,
  type WebsiteChangeOutcome,
} from './-employers.company-profile';

import { boardForms } from '@/board/form-layout';
import { useRootSession } from '@/components/root-session';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionSuccess,
} from '@/lib/action-toast';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/employers/companies/$slug/profile')({
  // How a website change ended, when its emailed link lands here.
  validateSearch: (
    search: UrlSearchInput,
  ): { website?: WebsiteChangeOutcome } => {
    const website = searchString(search.website);
    return website === 'changed' ||
      website === 'pending_review' ||
      website === 'conflict'
      ? { website }
      : {};
  },
  loader: createCompanyProfileLoader(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerCompany_metaTitle(),
        ),
      },
    ],
  }),
  staticData: { ownsMain: true },
  component: CompanyProfilePage,
});

const rootApi = getRouteApi('__root__');

function CompanyProfilePage() {
  const data = Route.useLoaderData();
  const { website } = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const router = useRouter();
  const { refreshSession } = useRootSession();
  return (
    <CompanyProfilePageView
      data={{
        ...data,
        formLayout: boardForms(board)?.company ?? null,
        websiteOutcome: website,
      }}
      actions={{
        updateCompany,
        uploadCompanyLogo,
        deleteCompany,
        invalidate: async () => {
          await router.invalidate();
          // The header shows the company's name from the session, so a rename
          // re-reads it too. Kept out of this page's result: a failed re-read
          // only leaves the header stale, and must not lock the form.
          void reconcileCommittedAction(refreshSession);
        },
        navigateToDashboard: () =>
          router.navigate({ to: '/employers/dashboard' }),
        toastError: (message) => void toastActionError(message),
        toastSuccess: (message) => void toastActionSuccess(message),
      }}
    />
  );
}
