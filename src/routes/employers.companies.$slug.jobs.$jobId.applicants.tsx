import { createFileRoute, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { m } from '../paraglide/messages';
import {
  addApplicantNote,
  bulkRejectApplicants,
  convertSourcedCandidate,
  createStage,
  moveApplicant,
  removeStage,
  renameStage,
} from '../server/employers';
import {
  ApplicantsPageView,
  createApplicantsLoader,
} from './-employers.applicants';

import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute(
  '/employers/companies/$slug/jobs/$jobId/applicants',
)({
  loader: createApplicantsLoader(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerApplicants_title(),
        ),
      },
    ],
  }),
  staticData: { ownsMain: true },
  component: ApplicantsPage,
});

function ApplicantsPage() {
  const { slug } = Route.useParams();
  const pipeline = Route.useLoaderData();
  const router = useRouter();
  return (
    <ApplicantsPageView
      slug={slug}
      pipeline={pipeline}
      actions={{
        moveApplicant,
        bulkRejectApplicants,
        addApplicantNote,
        createStage,
        renameStage,
        removeStage,
        convertSourced: convertSourcedCandidate,
        invalidate: () => router.invalidate(),
        toastError: toast.error,
      }}
    />
  );
}
