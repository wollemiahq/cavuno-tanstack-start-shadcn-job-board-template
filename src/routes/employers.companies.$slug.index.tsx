import { boardCopy } from '#/copy';

import { formatDate } from '@cavuno/board/format';
import {
  createFileRoute,
  getRouteApi,
  Link,
  useRouter,
} from '@tanstack/react-router';
import { MoreHorizontalIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  employerJobStatusBadgeVariant,
  employerJobStatusLabel,
  employerJobTypeLabel,
  isEmployerJobExpired,
} from '../lib/employer-job-labels';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import {
  deleteJob,
  getCompanyWorkspace,
  publishJob,
  unpublishJob,
} from '../server/employers';
/**
 * Company workspace — the company's jobs. Each row's role name links to the
 * job's own edit page (a draft publishes + pays there; the inline checkout
 * popover is gone). Every row action — publish included — lives in the single
 * per-row overflow menu; a draft's "Publish" lands on the edit page.
 */
import { getSeoBase } from '../server/queries';

import { Page, PageContent } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { headTitle } from '@/lib/page-title';
import type { EmployerJobSummary } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/employers/companies/$slug/')({
  loader: async ({ params, location }) => {
    try {
      const [workspace, seo] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        getSeoBase(),
      ]);
      return { ...workspace, seo };
    } catch (error) {
      return await handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}`,
        { retried: isReauthRetry(location) },
      );
    }
  },
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

function activeJobsSubtitle(count: number) {
  if (count === 0) return m.employerJobs_activeJobsZero();
  if (count === 1) return m.employerJobs_activeJobsOne();
  return m.employerJobs_activeJobsMany({ count });
}

function CompanyJobsPage() {
  const { slug, membership, jobs } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const copy = boardCopy(board.language, board.labels);
  const company = membership?.company;
  const companyName = company?.name ?? slug;
  // "Active" = live on the public board (published and not past expiry).
  const activeCount = jobs.data.filter(
    (job) => job.status === 'published' && !isEmployerJobExpired(job),
  ).length;

  const postJobLink = (
    <Link
      to="/employers/companies/$slug/jobs/new"
      params={{ slug }}
      className={buttonVariants()}
    >
      <PlusIcon data-icon="inline-start" aria-hidden />
      {copy.nav.post}
    </Link>
  );

  return (
    <Page width="content">
      <PageContent>
        <div className="space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                {m.employerJobs_companyJobsHeading({ company: companyName })}
              </h1>
              {jobs.data.length > 0 ? (
                <p className="text-muted-foreground text-sm">
                  {activeJobsSubtitle(activeCount)}
                </p>
              ) : null}
            </div>
            {jobs.data.length > 0 ? postJobLink : null}
          </header>

          {jobs.data.length === 0 ? (
            <Empty className="min-h-96 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PlusIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{m.employerCompany_noJobsText()}</EmptyTitle>
                <EmptyDescription>
                  {m.employerCompany_jobsEmptyText()}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>{postJobLink}</EmptyContent>
            </Empty>
          ) : (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.employerJobs_roleColumn()}</TableHead>
                    <TableHead>{m.employerJobs_typeColumn()}</TableHead>
                    <TableHead>{m.employerJobs_statusColumn()}</TableHead>
                    <TableHead className="text-right">
                      {m.employerJobs_actionsColumn()}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.data.map((job) => (
                    <JobRow
                      key={job.id}
                      slug={slug}
                      job={job}
                      language={board.language}
                    />
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </PageContent>
    </Page>
  );
}

function JobRow({
  slug,
  job,
  language,
}: {
  slug: string;
  job: EmployerJobSummary;
  language: string;
}) {
  const router = useRouter();
  const expired = isEmployerJobExpired(job);
  const displayStatus = expired ? 'expired' : job.status;
  const isDraft = job.status === 'draft';
  const isPublished = job.status === 'published' && !expired;

  async function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    const result = await fn();
    if (result.ok) {
      await router.invalidate();
    } else {
      toast.error(result.message ?? m.employerCompany_genericError());
    }
  }

  // The one smart "Republish": try to publish with the job's existing
  // entitlement. If the server still honours it the job goes live and we
  // toast; anything the server refuses (payment required, expired credit)
  // routes to the edit page, where the plan picker + payment live.
  async function republish() {
    const result = await publishJob({ data: { slug, id: job.id } });
    if (result.ok) {
      toast.success(m.employerJobs_republishedToast());
      await router.invalidate();
      return;
    }
    await router.navigate({
      to: '/employers/companies/$slug/jobs/$jobId/edit',
      params: { slug, jobId: job.id },
    });
  }

  const dateLine = expired
    ? job.expiresAt
      ? m.employerJobs_expiredOn({
          date: formatDate(language, job.expiresAt) ?? '',
        })
      : null
    : job.publishedAt
      ? m.jobDetail_posted({
          date: formatDate(language, job.publishedAt) ?? '',
        })
      : null;

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-48">
          <Link
            to="/employers/companies/$slug/jobs/$jobId/edit"
            params={{ slug, jobId: job.id }}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {job.title}
          </Link>
          {dateLine ? (
            <p className="text-muted-foreground text-xs">{dateLine}</p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {employerJobTypeLabel(language, job.employmentType)}
      </TableCell>
      <TableCell>
        <Badge variant={employerJobStatusBadgeVariant(displayStatus)}>
          {employerJobStatusLabel(displayStatus)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex min-w-max items-center justify-end gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.employerJobs_actionsMenuLabel({
                    title: job.title,
                  })}
                />
              }
            >
              <MoreHorizontalIcon aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* A draft publishes from its own edit page (plan picker + pay). */}
              {isDraft ? (
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug/jobs/$jobId/edit"
                      params={{ slug, jobId: job.id }}
                    />
                  }
                >
                  {m.employerJobs_publishLabel()}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                nativeButton={false}
                render={
                  <Link
                    to="/employers/companies/$slug/jobs/$jobId/edit"
                    params={{ slug, jobId: job.id }}
                  />
                }
              >
                {m.employerJobs_editLabel()}
              </DropdownMenuItem>
              {!isDraft && !isPublished ? (
                <DropdownMenuItem onClick={() => void republish()}>
                  {m.employerCompany_republishLabel()}
                </DropdownMenuItem>
              ) : null}
              {isPublished ? (
                <DropdownMenuItem
                  onClick={() =>
                    act(() => unpublishJob({ data: { slug, id: job.id } }))
                  }
                >
                  {m.employerCompany_unpublishLabel()}
                </DropdownMenuItem>
              ) : null}
              {!isDraft && job.links.public ? (
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <a
                      href={job.links.public}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  {m.employerCompany_viewLabel()}
                </DropdownMenuItem>
              ) : null}
              {/* Drafts have never taken applications — hide the pipeline. */}
              {!isDraft ? (
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to="/employers/companies/$slug/jobs/$jobId/applicants"
                      params={{ slug, jobId: job.id }}
                    />
                  }
                >
                  {m.employerCompany_applicantsLabel()}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  act(() => deleteJob({ data: { slug, id: job.id } }))
                }
              >
                {m.employerCompany_deleteLabel()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
