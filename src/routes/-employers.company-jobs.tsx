import { useRef, useState } from 'react';

import { formatDate } from '@cavuno/board/format';
import { Await, Link } from '@tanstack/react-router';
import { MoreHorizontalIcon, PlusIcon } from 'lucide-react';

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
import { getLocale } from '../paraglide/runtime';
import {
  deleteJob,
  getCompanyWorkspace,
  getEmployerJobStats,
  getEmployerJobStatsTimeseries,
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

import {
  toEmployerJobStatCellsVM,
  toEmployerJobStatsIndex,
  toEmployerStatsChartVM,
} from '@/board/employer-stats-view-model';
import {
  EmployerStatsChart,
  EmployerStatsChartPending,
} from '@/components/employer/employer-stats-chart';
import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { navCopy } from '@/copy-groups/nav';
import { boardErrorMessage } from '@/lib/board-error-message';
import type { UrlSearchInput } from '@/lib/pagination';
import type {
  EmployerJobStat,
  EmployerJobStatsPoint,
  EmployerJobSummary,
} from '@cavuno/board';

export type CompanyJobsLoaderDependencies = {
  getCompanyWorkspace: (
    ...args: Parameters<typeof getCompanyWorkspace>
  ) => ReturnType<typeof getCompanyWorkspace>;
  getEmployerJobStats: (
    ...args: Parameters<typeof getEmployerJobStats>
  ) => Promise<{ data: EmployerJobStat[] }>;
  getEmployerJobStatsTimeseries: (
    ...args: Parameters<typeof getEmployerJobStatsTimeseries>
  ) => Promise<{ data: EmployerJobStatsPoint[] }>;
  getSeoBase: (
    ...args: Parameters<typeof getSeoBase>
  ) => Promise<{ boardName: string }>;
  handleEmployerLoaderError: typeof handleEmployerLoaderError;
};

const companyJobsLoaderDependencies: CompanyJobsLoaderDependencies = {
  getCompanyWorkspace,
  getEmployerJobStats,
  getEmployerJobStatsTimeseries,
  getSeoBase,
  handleEmployerLoaderError,
};

export function createCompanyJobsLoader(
  dependencies?: CompanyJobsLoaderDependencies,
) {
  return async ({
    params,
    location,
  }: {
    params: { slug: string };
    location: { search?: UrlSearchInput; searchStr?: string };
  }) => {
    const loaderDependencies = dependencies ?? companyJobsLoaderDependencies;
    const noTimeseries = (): EmployerJobStatsPoint[] => [];
    try {
      // Reporting is non-critical: both stats reads stream in via <Await> and
      // degrade to empty (dashed stat cells, empty chart state); the retrieve
      // endpoint zero-fills on outage. They need only the slug, so they start
      // BEFORE the workspace batch is awaited — starting them after made them
      // a second serial wave behind it.
      const statsIndex = loaderDependencies
        .getEmployerJobStats({ data: { slug: params.slug } })
        .then((result) => toEmployerJobStatsIndex(result.data))
        .catch(() => new Map<string, EmployerJobStat>());
      const timeseries = loaderDependencies
        .getEmployerJobStatsTimeseries({ data: { slug: params.slug } })
        .then((result) => result.data)
        .catch(noTimeseries);
      const [workspace, seo] = await Promise.all([
        loaderDependencies.getCompanyWorkspace({ data: { slug: params.slug } }),
        loaderDependencies.getSeoBase(),
      ]);
      return { ...workspace, seo, statsIndex, timeseries };
    } catch (error) {
      return await loaderDependencies.handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}`,
        {
          retried: isReauthRetry(location),
          incomingSearch: location.searchStr ?? location.search,
        },
      );
    }
  };
}

export type CompanyJobsViewActions = {
  deleteJob: (
    ...args: Parameters<typeof deleteJob>
  ) => Promise<
    { ok: true; data?: object | null } | { ok: false; message: string }
  >;
  publishJob: (
    ...args: Parameters<typeof publishJob>
  ) => Promise<
    { ok: true; data?: object | null } | { ok: false; message: string }
  >;
  unpublishJob: (
    ...args: Parameters<typeof unpublishJob>
  ) => Promise<
    { ok: true; data?: object | null } | { ok: false; message: string }
  >;
  invalidate: () => Promise<void>;
  navigateToEdit: (slug: string, jobId: string) => Promise<void>;
  toastError: (message: string) => void;
  toastSuccess: (message: string) => void;
};

export type CompanyJobsLoaderData = Awaited<
  ReturnType<ReturnType<typeof createCompanyJobsLoader>>
>;

export type CompanyJobsViewData = {
  slug: string;
  membership: { company: { name: string } } | null;
  jobs: { data: EmployerJobSummary[] };
  statsIndex: Promise<Map<string, EmployerJobStat>>;
  timeseries: Promise<EmployerJobStatsPoint[]>;
};

function activeJobsSubtitle(count: number) {
  if (count === 0) return m.employerJobs_activeJobsZero();
  const locale = getLocale();
  return m.employerJobs_activeJobs({
    count,
    countLabel: count.toLocaleString(locale),
  });
}

export function CompanyJobsPageView({
  data,
  actions,
}: {
  data: CompanyJobsViewData;
  actions: CompanyJobsViewActions;
}) {
  const { slug, membership, jobs, statsIndex, timeseries } = data;
  const copy = {
    nav: navCopy(),
  };
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
              <Text as="h1" variant="heading1">
                {m.employerJobs_companyJobsHeading({ company: companyName })}
              </Text>
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
            <>
              {/* Reporting chart — deferred (streamed via <Await>) so it never
                  blocks the table below. Its empty state covers the zero-activity
                  window; the fallback reserves the chart's height. */}
              <Await
                promise={timeseries}
                fallback={<EmployerStatsChartPending />}
              >
                {(points) => (
                  <EmployerStatsChart
                    vm={toEmployerStatsChartVM(points, getLocale())}
                  />
                )}
              </Await>

              <Card className="py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{m.employerJobs_roleColumn()}</TableHead>
                      <TableHead>{m.employerJobs_typeColumn()}</TableHead>
                      <TableHead>{m.employerJobs_statusColumn()}</TableHead>
                      <TableHead className="text-end">
                        {m.employerJobs_viewsColumn()}
                      </TableHead>
                      <TableHead className="text-end">
                        {m.employerJobs_applyClicksColumn()}
                      </TableHead>
                      <TableHead className="text-end">
                        {m.employerJobs_applicationsColumn()}
                      </TableHead>
                      <TableHead className="text-end">
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
                        language={getLocale()}
                        statsIndex={statsIndex}
                        actions={actions}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </div>
      </PageContent>
    </Page>
  );
}

/** The three right-aligned stat cells for one row, resolved from the join. */
function StatCells({
  cells,
}: {
  cells: {
    views: string;
    applyClicks: string;
    applications: string;
    applicationsNotApplicable: boolean;
  };
}) {
  return (
    <>
      <TableCell className="text-muted-foreground text-end tabular-nums">
        {cells.views}
      </TableCell>
      <TableCell className="text-muted-foreground text-end tabular-nums">
        {cells.applyClicks}
      </TableCell>
      <TableCell
        className="text-muted-foreground text-end tabular-nums"
        title={
          cells.applicationsNotApplicable
            ? m.employerJobs_statUnavailableLabel()
            : undefined
        }
      >
        {cells.applicationsNotApplicable ? (
          <>
            <span aria-hidden>{cells.applications}</span>
            <span className="sr-only">
              {m.employerJobs_statUnavailableLabel()}
            </span>
          </>
        ) : (
          cells.applications
        )}
      </TableCell>
    </>
  );
}

/** The pending placeholder for the three stat cells while stats stream in. */
function StatCellsPending() {
  return (
    <>
      <TableCell className="text-end">
        <Skeleton className="ms-auto h-4 w-8" />
      </TableCell>
      <TableCell className="text-end">
        <Skeleton className="ms-auto h-4 w-8" />
      </TableCell>
      <TableCell className="text-end">
        <Skeleton className="ms-auto h-4 w-8" />
      </TableCell>
    </>
  );
}

function JobRow({
  slug,
  job,
  language,
  statsIndex,
  actions,
}: {
  slug: string;
  job: EmployerJobSummary;
  language: string;
  statsIndex: Promise<Map<string, EmployerJobStat>>;
  actions: CompanyJobsViewActions;
}) {
  const expired = isEmployerJobExpired(job);
  const displayStatus = expired ? 'expired' : job.status;
  const isDraft = job.status === 'draft';
  const isPublished = job.status === 'published' && !expired;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'status' | 'republish' | 'delete' | null
  >(null);
  const deletePendingRef = useRef(false);

  async function reconcile() {
    try {
      await actions.invalidate();
    } catch {
      actions.toastError(m.employerCompany_reconciliationError());
    }
  }

  async function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    if (pendingAction) return;
    setPendingAction('status');
    let result: { ok: boolean; message?: string };
    try {
      result = await fn();
    } catch {
      // A rejecting call (network drop, 5xx) must surface, not vanish.
      actions.toastError(m.employerCompany_genericError());
      setPendingAction(null);
      return;
    }
    if (!result.ok) {
      actions.toastError(boardErrorMessage(result));
      setPendingAction(null);
      return;
    }
    await reconcile();
    setPendingAction(null);
  }

  // The one smart "Republish": try to publish with the job's existing
  // entitlement. If the server still honours it the job goes live and we
  // toast; anything the server refuses (payment required, expired credit)
  // routes to the edit page, where the plan picker + payment live.
  async function republish() {
    if (pendingAction) return;
    setPendingAction('republish');
    let result;
    try {
      result = await actions.publishJob({ data: { slug, id: job.id } });
    } catch {
      // A transport failure is not a server refusal — routing to the edit
      // page would misread it as "payment required". Surface and stop.
      actions.toastError(m.employerCompany_genericError());
      setPendingAction(null);
      return;
    }
    if (result.ok) {
      actions.toastSuccess(m.employerJobs_republishedToast());
      await reconcile();
      setPendingAction(null);
      return;
    }
    try {
      await actions.navigateToEdit(slug, job.id);
    } catch {
      actions.toastError(m.employerCompany_genericError());
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmDelete() {
    if (pendingAction || deletePendingRef.current) return;
    deletePendingRef.current = true;
    setPendingAction('delete');
    let result;
    try {
      result = await actions.deleteJob({ data: { slug, id: job.id } });
    } catch {
      actions.toastError(m.employerCompany_genericError());
      setPendingAction(null);
      deletePendingRef.current = false;
      return;
    }
    if (!result.ok) {
      actions.toastError(boardErrorMessage(result));
      setPendingAction(null);
      deletePendingRef.current = false;
      return;
    }
    setDeleteOpen(false);
    actions.toastSuccess(m.employerJobs_deletedToast({ title: job.title }));
    await reconcile();
    setPendingAction(null);
    deletePendingRef.current = false;
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
      <Await promise={statsIndex} fallback={<StatCellsPending />}>
        {(index) => (
          <StatCells
            cells={toEmployerJobStatCellsVM(index.get(job.id), language)}
          />
        )}
      </Await>
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
                    act(() =>
                      actions.unpublishJob({ data: { slug, id: job.id } }),
                    )
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
                onClick={() => setDeleteOpen(true)}
              >
                {m.employerCompany_deleteLabel()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              if (!open && pendingAction === 'delete') return;
              setDeleteOpen(open);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {m.employerJobs_deleteConfirmTitle({ title: job.title })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {m.employerJobs_deleteConfirmBody({ title: job.title })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pendingAction === 'delete'}>
                  {m.dangerZone_cancelLabel()}
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={pendingAction === 'delete'}
                  onClick={confirmDelete}
                >
                  {pendingAction === 'delete'
                    ? m.employerJobs_deletingLabel()
                    : m.employerCompany_deleteLabel()}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
