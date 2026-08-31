import { notFound, redirect } from '@tanstack/react-router';

import { toPipelineBoardVM } from '../board/pipeline-view-model';
import {
  ApplicantPipelineBoard,
  type PipelineActions,
} from '../components/employer/applicant-pipeline-board';
import { incomingAuthSearch } from '../lib/board-datalayer-events';
import { employerJobStatusLabel } from '../lib/employer-job-labels';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getPipeline } from '../server/employers';
import { getBoardContext, getSeoBase } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import type { UrlSearchInput } from '@/lib/pagination';

export type ApplicantsLoaderDependencies = {
  getBoardContext: () => Promise<{
    features: { nativeApplications: boolean };
  }>;
  getPipeline: (
    ...args: Parameters<typeof getPipeline>
  ) => ReturnType<typeof getPipeline>;
  getSeoBase: (
    ...args: Parameters<typeof getSeoBase>
  ) => Promise<{ boardName: string }>;
  handleEmployerLoaderError: typeof handleEmployerLoaderError;
};

const applicantsLoaderDependencies: ApplicantsLoaderDependencies = {
  getBoardContext,
  getPipeline,
  getSeoBase,
  handleEmployerLoaderError,
};

export function createApplicantsLoader(
  dependencies?: ApplicantsLoaderDependencies,
) {
  return async ({
    params,
    location,
  }: {
    params: { slug: string; jobId: string };
    location: { search?: UrlSearchInput; searchStr?: string };
  }) => {
    const loaderDependencies = dependencies ?? applicantsLoaderDependencies;
    const board = await loaderDependencies.getBoardContext();
    if (!board.features.nativeApplications) throw notFound();
    try {
      const [pipeline, seo] = await Promise.all([
        loaderDependencies.getPipeline({
          data: { slug: params.slug, job: params.jobId },
        }),
        loaderDependencies.getSeoBase(),
      ]);
      if (pipeline.job.status === 'draft') {
        throw redirect({
          to: '/employers/companies/$slug/jobs/$jobId/edit',
          params: { slug: params.slug, jobId: params.jobId },
        });
      }
      return { ...pipeline, seo };
    } catch (error) {
      return await loaderDependencies.handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/jobs/${params.jobId}/applicants`,
        {
          retried: isReauthRetry(location),
          incomingSearch: incomingAuthSearch(location),
        },
      );
    }
  };
}

export type ApplicantsLoaderData = Awaited<
  ReturnType<ReturnType<typeof createApplicantsLoader>>
>;

export function ApplicantsPageView({
  slug,
  pipeline,
  actions,
}: {
  slug: string;
  pipeline: ApplicantsLoaderData;
  actions: PipelineActions;
}) {
  const boardVM = toPipelineBoardVM(pipeline, getLocale());
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
              {m.employerApplicants_count({
                count: pipeline.applicants.length,
                countLabel: String(pipeline.applicants.length),
              })}
            </p>
          </header>

          {hasStages ? (
            <ApplicantPipelineBoard
              slug={slug}
              jobId={pipeline.job.id}
              board={boardVM}
              actions={actions}
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
