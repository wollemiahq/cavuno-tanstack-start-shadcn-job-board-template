import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { toPipelineBoardVM } from '../board/pipeline-view-model';
import { ApplicantPipelineBoard } from '../components/employer/applicant-pipeline-board';
import { employerJobStatusLabel } from '../lib/employer-job-labels';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import {
  addApplicantNote,
  bulkRejectApplicants,
  createStage,
  getPipeline,
  moveApplicant,
  removeStage,
  renameStage,
} from '../server/employers';
import { getBoardContext, getSeoBase } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { headTitle } from '@/lib/page-title';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute(
  '/employers/companies/$slug/jobs/$jobId/applicants',
)({
  loader: async ({ params, location }) => {
    // External-apply-only board (nativeApplications off): the platform 404s
    // the pipeline / applicants reads. Degrade to a route-level notFound so
    // the employer surface reads as absent, never an error state.
    const board = await getBoardContext();
    if (!board.features.nativeApplications) throw notFound();
    try {
      const [pipeline, seo] = await Promise.all([
        getPipeline({ data: { slug: params.slug, job: params.jobId } }),
        getSeoBase(),
      ]);
      // A draft has never taken applications — there is no pipeline to show.
      // The workspace menu already hides the link; this guards direct URLs.
      if (pipeline.job.status === 'draft') {
        throw redirect({
          to: '/employers/companies/$slug/jobs/$jobId/edit',
          params: { slug: params.slug, jobId: params.jobId },
        });
      }
      return { ...pipeline, seo };
    } catch (error) {
      return await handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/jobs/${params.jobId}/applicants`,
        { retried: isReauthRetry(location) },
      );
    }
  },
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
  const { board } = rootApi.useLoaderData();
  const boardVM = toPipelineBoardVM(pipeline, board.language);
  const hasStages = boardVM.stages.length > 0;

  return (
    <Page width="wide">
      <PageContent>
        <div className="space-y-8">
          <header className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {pipeline.job.title}
            </h1>
            <p className="text-muted-foreground text-sm">
              {employerJobStatusLabel(pipeline.job.status)} ·{' '}
              {pipeline.applicants.length === 1
                ? m.employerApplicants_countOne({
                    count: pipeline.applicants.length,
                  })
                : m.employerApplicants_countMany({
                    count: pipeline.applicants.length,
                  })}
            </p>
          </header>

          {hasStages ? (
            <ApplicantPipelineBoard
              slug={slug}
              jobId={pipeline.job.id}
              board={boardVM}
              actions={{
                moveApplicant,
                bulkRejectApplicants,
                addApplicantNote,
                createStage,
                renameStage,
                removeStage,
              }}
            />
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>
                  {m.employerApplicants_noApplicantsText()}
                </EmptyTitle>
                <EmptyDescription>
                  {m.employerApplicants_stagesHeading()}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </PageContent>
    </Page>
  );
}
