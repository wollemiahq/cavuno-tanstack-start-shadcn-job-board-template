/**
 * Company workspace — Jobs tab: job management, publishing and checkout.
 * Creating a job lives on its own page (`jobs/new`), mirroring the public
 * post form.
 */
import { useState } from 'react';

import { boardCopy } from '#/copy';

import { formatDate } from '@cavuno/board/format';
import {
  createFileRoute,
  getRouteApi,
  Link,
  useRouter,
} from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import {
  employerJobStatusLabel,
  employerJobTypeLabel,
} from '../lib/employer-job-labels';
import { handleEmployerLoaderError } from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import {
  checkoutJob,
  deleteJob,
  getCompanyWorkspace,
  publishJob,
  unpublishJob,
} from '../server/employers';

import { EmployerCompanyShell } from '@/components/account-shell';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type {
  EmployerBillingOption,
  EmployerJobSummary,
  JobPostingPlan,
} from '@cavuno/board';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/employers/companies/$slug/')({
  loader: async ({ params }) => {
    try {
      return await getCompanyWorkspace({ data: { slug: params.slug } });
    } catch (error) {
      handleEmployerLoaderError(error, `/employers/companies/${params.slug}`);
    }
  },
  head: () => ({ meta: [{ title: m.employerCompany_metaTitle() }] }),
  staticData: { ownsMain: true },
  component: CompanyJobsPage,
});

function CompanyJobsPage() {
  const { slug, membership, jobs, billingOptions, plans } =
    Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const copy = boardCopy(board.language, board.labels);
  const company = membership?.company;

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
    <EmployerCompanyShell
      slug={slug}
      company={{
        name: company?.name ?? slug,
        website: company?.website ?? null,
        logoUrl: company?.logoUrl ?? null,
      }}
      active="jobs"
    >
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {m.employerJobs_yourJobsHeading()}
            </h1>
            {jobs.data.length > 0 ? (
              <p className="text-muted-foreground text-sm">
                {m.employerCompany_jobsHeading({ count: jobs.data.length })}
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
                    billingOptions={billingOptions.data}
                    plans={plans}
                    language={board.language}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </EmployerCompanyShell>
  );
}

function JobRow({
  slug,
  job,
  billingOptions,
  plans,
  language,
}: {
  slug: string;
  job: EmployerJobSummary;
  billingOptions: EmployerBillingOption[];
  plans: JobPostingPlan[];
  language: string;
}) {
  const router = useRouter();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [message, setMessage] = useState('');
  const isLive = job.status === 'published';

  async function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage('');
    const result = await fn();
    if (result.ok) {
      await router.invalidate();
    } else {
      setMessage(result.message ?? m.employerCompany_genericError());
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="min-w-48">
            <p className="text-foreground font-medium">{job.title}</p>
            {job.publishedAt ? (
              <p className="text-muted-foreground text-xs">
                {m.jobDetail_posted({
                  date: formatDate(language, job.publishedAt) ?? '',
                })}
              </p>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {employerJobTypeLabel(language, job.employmentType)}
        </TableCell>
        <TableCell>
          <Badge variant={isLive ? 'default' : 'secondary'}>
            {employerJobStatusLabel(job.status)}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex min-w-max flex-wrap justify-end gap-1">
            {isLive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  act(() => unpublishJob({ data: { slug, id: job.id } }))
                }
              >
                {m.employerCompany_unpublishLabel()}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  aria-expanded={checkoutOpen}
                  onClick={() => setCheckoutOpen((open) => !open)}
                >
                  {checkoutOpen
                    ? m.employerCompany_closeLabel()
                    : m.employerCompany_publishPayLabel()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    act(() => publishJob({ data: { slug, id: job.id } }))
                  }
                >
                  {m.employerCompany_republishLabel()}
                </Button>
              </>
            )}
            {isLive && job.links.public ? (
              <a
                href={job.links.public}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                {m.employerCompany_viewLabel()}
              </a>
            ) : null}
            <Link
              to="/employers/companies/$slug/jobs/$jobId/applicants"
              params={{ slug, jobId: job.id }}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              {m.employerCompany_applicantsLabel()}
            </Link>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() =>
                act(() => deleteJob({ data: { slug, id: job.id } }))
              }
            >
              {m.employerCompany_deleteLabel()}
            </Button>
          </div>
          {message ? (
            <p
              role="alert"
              className="text-destructive mt-2 text-right text-sm"
            >
              {message}
            </p>
          ) : null}
        </TableCell>
      </TableRow>
      {checkoutOpen && !isLive ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="whitespace-normal">
            <CheckoutPicker
              slug={slug}
              jobId={job.id}
              billingOptions={billingOptions}
              plans={plans}
              language={language}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function CheckoutPicker({
  slug,
  jobId,
  billingOptions,
  plans,
  language,
}: {
  slug: string;
  jobId: string;
  billingOptions: EmployerBillingOption[];
  plans: JobPostingPlan[];
  language: string;
}) {
  const router = useRouter();
  const [checkoutState, setCheckoutState] = useState<{
    pendingKey: string | null;
    message: string;
  }>({ pendingKey: null, message: '' });
  const { pendingKey, message } = checkoutState;

  async function pay(
    pendingKey: string,
    body: Parameters<typeof checkoutJob>[0]['data']['body'],
  ) {
    if (checkoutState.pendingKey !== null) return;
    setCheckoutState({ pendingKey, message: '' });
    try {
      const result = await checkoutJob({ data: { slug, id: jobId, body } });
      if (!result.ok) {
        setCheckoutState({ pendingKey: null, message: result.message });
        return;
      }
      const outcome = result.data;
      if (outcome.status === 'checkout' && outcome.checkoutUrl) {
        window.location.assign(outcome.checkoutUrl);
      } else if (outcome.status === 'invoice_sent') {
        setCheckoutState({
          pendingKey: null,
          message: m.employerCompany_invoiceSentText(),
        });
      } else {
        await router.invalidate();
      }
    } catch {
      setCheckoutState({
        pendingKey: null,
        message: m.employerCompany_genericError(),
      });
    } finally {
      setCheckoutState((current) => ({ ...current, pendingKey: null }));
    }
  }

  return (
    <Card size="sm" className="bg-muted/40">
      <CardHeader>
        <CardTitle>{m.employerCompany_choosePlanHeading()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {billingOptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">
              {m.employerCompany_reusableCreditsLabel()}
            </p>
            {billingOptions.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant="outline"
                className="w-full justify-between"
                disabled={pendingKey !== null}
                aria-busy={pendingKey === option.id}
                onClick={() =>
                  pay(option.id, {
                    billing: {
                      type: option.type,
                      planId: option.planId,
                      id: option.id,
                    },
                  })
                }
              >
                <span className="flex items-center gap-2">
                  {pendingKey === option.id ? <Spinner /> : null}
                  {option.planName}
                </span>
                <span className="text-muted-foreground">
                  {m.employerCompany_creditsRemaining({
                    count: option.jobsRemaining,
                  })}
                </span>
              </Button>
            ))}
          </div>
        ) : null}

        {plans.length > 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">
              {m.employerCompany_buyPlanLabel()}
            </p>
            {plans.map((plan) => {
              const price =
                plan.prices.find((candidate) => candidate.isActive) ??
                plan.prices[0];
              return (
                <Button
                  key={plan.id}
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={pendingKey !== null}
                  aria-busy={pendingKey === plan.id}
                  onClick={() =>
                    pay(plan.id, {
                      billing: { type: 'new', planId: plan.id },
                    })
                  }
                >
                  <span className="flex items-center gap-2">
                    {pendingKey === plan.id ? <Spinner /> : null}
                    {plan.name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatPrice(language, price?.currency, price?.amountCents)}
                  </span>
                </Button>
              );
            })}
          </div>
        ) : billingOptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {m.employerCompany_noPlansText()}
          </p>
        ) : null}

        {message ? (
          <p
            role={
              message === m.employerCompany_invoiceSentText()
                ? 'status'
                : 'alert'
            }
            className={cn(
              'text-sm',
              message === m.employerCompany_invoiceSentText()
                ? 'text-foreground'
                : 'text-destructive',
            )}
          >
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatPrice(
  language: string,
  currency: string | undefined,
  amountCents: number | undefined,
) {
  if (currency === undefined || amountCents === undefined) return '';
  if (amountCents === 0) return m.employerCompany_freeLabel();
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100);
}
