import { createFileRoute, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { parseCompanyJobsSearch } from '../lib/company-jobs-search';
import { m } from '../paraglide/messages';
import { deleteJob, publishJob, unpublishJob } from '../server/employers';
import {
  CompanyJobsPageView,
  createCompanyJobsLoader,
} from './-employers.company-jobs';

import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/employers/companies/$slug/')({
  validateSearch: (search: UrlSearchInput) => parseCompanyJobsSearch(search),
  loader: createCompanyJobsLoader(),
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
  component: CompanyJobsPage,
});

function CompanyJobsPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  return (
    <CompanyJobsPageView
      data={data}
      search={search}
      actions={{
        deleteJob,
        publishJob,
        unpublishJob,
        invalidate: () => router.invalidate(),
        navigateToEdit: (slug, jobId) =>
          router.navigate({
            to: '/employers/companies/$slug/jobs/$jobId/edit',
            params: { slug, jobId },
          }),
        toastError: toast.error,
        toastSuccess: toast.success,
      }}
    />
  );
}
