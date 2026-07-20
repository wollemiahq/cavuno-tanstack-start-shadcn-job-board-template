import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';

import { toPipelineBoardVM } from '../board/pipeline-view-model';
import { ApplicantPipelineBoard } from '../components/employer/applicant-pipeline-board';
import { employerJobStatusLabel } from '../lib/employer-job-labels';
import { handleEmployerLoaderError } from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { getPipeline } from '../server/employers';
import { getSeoBase } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import { buttonVariants } from '@/components/ui/button';
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
  loader: async ({ params }) => {
    try {
      const [pipeline, seo] = await Promise.all([
        getPipeline({ data: { slug: params.slug, job: params.jobId } }),
        getSeoBase(),
      ]);
      return { ...pipeline, seo };
    } catch (error) {
      handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/jobs/${params.jobId}/applicants`,
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
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
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
            </div>
            <Link
              to="/employers/companies/$slug"
              params={{ slug }}
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.employerApplicants_backToCompanyLabel()}
            </Link>
          </header>

          {hasStages ? (
            <ApplicantPipelineBoard
              slug={slug}
              jobId={pipeline.job.id}
              board={boardVM}
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
