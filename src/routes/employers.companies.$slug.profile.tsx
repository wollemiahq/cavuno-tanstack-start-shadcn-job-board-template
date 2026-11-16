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
} from './-employers.company-profile';

import { boardForms } from '@/board/form-layout';
import { useRootSession } from '@/components/root-session';
import { toastActionError, toastActionSuccess } from '@/lib/action-toast';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/employers/companies/$slug/profile')({
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
  const { board } = rootApi.useLoaderData();
  const router = useRouter();
  const { refreshSession } = useRootSession();
  return (
    <CompanyProfilePageView
      data={{ ...data, formLayout: boardForms(board)?.company ?? null }}
      actions={{
        updateCompany,
        uploadCompanyLogo,
        deleteCompany,
        // The header shows the company's name from the session, so a rename
        // re-reads the session as well as this page.
        invalidate: async () => {
          await Promise.all([router.invalidate(), refreshSession()]);
        },
        navigateToDashboard: () =>
          router.navigate({ to: '/employers/dashboard' }),
        toastError: (message) => void toastActionError(message),
        toastSuccess: (message) => void toastActionSuccess(message),
      }}
    />
  );
}
