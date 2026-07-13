/**
 * Company workspace — Jobs tab (Paper "Employer Sidebar" layout B):
 * sidebar shell (identity + Jobs / Company profile nav), jobs table with
 * the publish/checkout/delete actions, and a collapsible post-a-job form.
 */
import { Text } from '@/components/text'
import { useState } from 'react'
import {
  createFileRoute,
  isRedirect,
  Link,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { Plus } from '@untitledui/icons'
import type {
  EmployerBillingOption,
  EmployerJobSummary,
  JobPostingPlan,
} from '@cavuno/board'
import { formatDate } from '@cavuno/board/format'

import { EmployerCompanyShell } from '@/components/account-shell'
import {
  checkoutJob,
  createJob,
  deleteJob,
  getCompanyWorkspace,
  publishJob,
  unpublishJob,
} from '../server/employers'
import { Badge } from '@/components/base/badges/badges'
import { Button, styles as buttonStyles } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { Label } from '@/components/base/input/label'
import { TextAreaBase } from '@/components/base/textarea/textarea'
import { cx } from '@/utils/cx'
import { m } from '../paraglide/messages'
import { boardCopy } from '#/copy'
import { getRouteApi } from '@tanstack/react-router'

const rootApi = getRouteApi('__root__')

export const Route = createFileRoute('/employers/companies/$slug/')({
  loader: async ({ params }) => {
    try {
      return await getCompanyWorkspace({ data: { slug: params.slug } })
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/auth/sign-in' })
    }
  },
  head: () => ({ meta: [{ title: m.employerCompany_metaTitle() }] }),
  component: CompanyJobsPage,
})

function CompanyJobsPage() {
  const { slug, membership, jobs, billingOptions, plans } =
    Route.useLoaderData()
  const { board } = rootApi.useLoaderData()
  const copy = boardCopy(board.language, board.labels)
  const [posting, setPosting] = useState(false)
  const company = membership?.company

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
        <header className="flex items-center justify-between gap-4">
          <div>
            <Text as="h1" variant="heading3">
              {m.employerJobs_yourJobsHeading()}
            </Text>
            <p className="text-tertiary text-sm">
              {m.employerCompany_jobsHeading({ count: jobs.data.length })}
            </p>
          </div>
          <Button
            color="primary"
            size="md"
            iconLeading={Plus}
            onClick={() => setPosting((open) => !open)}
          >
            {posting ? m.employerCompany_closeLabel() : copy.nav.post}
          </Button>
        </header>

        {posting ? <CreateJobForm slug={slug} /> : null}

        {jobs.data.length === 0 ? (
          <p className="border-secondary text-tertiary rounded-lg border border-dashed p-10 text-center">
            {m.employerCompany_noJobsText()}
          </p>
        ) : (
          <div className="rounded-xl border border-secondary">
            <div className="text-tertiary grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-secondary px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
              <span>{m.employerJobs_roleColumn()}</span>
              <span>{m.employerJobs_typeColumn()}</span>
              <span>{m.employerJobs_statusColumn()}</span>
            </div>
            <div className="divide-y divide-secondary">
              {jobs.data.map((job) => (
                <JobRow
                  key={job.id}
                  slug={slug}
                  job={job}
                  billingOptions={billingOptions.data}
                  plans={plans}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </EmployerCompanyShell>
  )
}

function CreateJobForm({ slug }: { slug: string }) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    applicationUrl: '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [message, setMessage] = useState('')

  return (
    <form
      className="space-y-3 rounded-lg border border-secondary p-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setStatus('saving')
        const result = await createJob({
          data: {
            slug,
            body: {
              title: form.title.trim(),
              description: form.description.trim(),
              applicationUrl: form.applicationUrl.trim(),
            },
          },
        })
        if (result.ok) {
          setForm({ title: '', description: '', applicationUrl: '' })
          setStatus('idle')
          await router.invalidate()
        } else {
          setStatus('error')
          setMessage(result.message)
        }
      }}
    >
      <Input
        label={m.employerCompany_titleLabel()}
        value={form.title}
        onChange={(value) => setForm({ ...form, title: value })}
        isRequired
      />
      <div className="space-y-1.5">
        <Label htmlFor="job-description">{m.employerCompany_descriptionLabel()}</Label>
        <TextAreaBase
          id="job-description"
          rows={4}
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          required
        />
      </div>
      <Input
        label={m.employerCompany_applyUrlLabel()}
        value={form.applicationUrl}
        placeholder={m.employerCompany_applyUrlPlaceholder()}
        onChange={(value) => setForm({ ...form, applicationUrl: value })}
        isRequired
      />
      <Button type="submit" color="primary" size="md" isDisabled={status === 'saving'}>
        {status === 'saving'
          ? m.employerCompany_creatingLabel()
          : m.employerCompany_createDraftLabel()}
      </Button>
      {status === 'error' ? (
        <p className="text-error-primary text-sm">{message}</p>
      ) : null}
      <p className="text-tertiary text-sm">
        {m.employerCompany_draftNoticeText()}
      </p>
    </form>
  )
}

function JobRow({
  slug,
  job,
  billingOptions,
  plans,
}: {
  slug: string
  job: EmployerJobSummary
  billingOptions: EmployerBillingOption[]
  plans: JobPostingPlan[]
}) {
  const router = useRouter()
  const { board } = rootApi.useLoaderData()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [message, setMessage] = useState('')
  const isLive = job.status === 'published'

  async function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage('')
    const result = await fn()
    if (result.ok) {
      await router.invalidate()
    } else {
      setMessage(result.message ?? m.employerCompany_genericError())
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3">
        <div className="min-w-0">
          <p className="text-primary truncate font-medium">{job.title}</p>
          {job.publishedAt ? (
            <p className="text-tertiary text-xs">
              {m.jobDetail_posted({
                date: formatDate(board.language, job.publishedAt) ?? '',
              })}
            </p>
          ) : null}
        </div>
        <span className="text-tertiary truncate text-sm">
          {job.employmentType ? job.employmentType.replaceAll('_', ' ') : '—'}
        </span>
        <Badge
          size="sm"
          type="pill-color"
          color={isLive ? 'success' : 'gray'}
          className="justify-self-start"
        >
          {job.status}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {isLive ? (
          <Button
            color="secondary"
            size="sm"
            onClick={() => act(() => unpublishJob({ data: { slug, id: job.id } }))}
          >
            {m.employerCompany_unpublishLabel()}
          </Button>
        ) : (
          <>
            <Button color="primary" size="sm" onClick={() => setCheckoutOpen((open) => !open)}>
              {checkoutOpen
                ? m.employerCompany_closeLabel()
                : m.employerCompany_publishPayLabel()}
            </Button>
            <Button
              color="secondary"
              size="sm"
              onClick={() => act(() => publishJob({ data: { slug, id: job.id } }))}
            >
              {m.employerCompany_republishLabel()}
            </Button>
          </>
        )}
        {isLive && job.links.public ? (
          <Button
            color="tertiary"
            size="sm"
            href={job.links.public}
            target="_blank"
            rel="noreferrer"
          >
            {m.employerCompany_viewLabel()}
          </Button>
        ) : null}
        <Link
          to="/employers/companies/$slug/jobs/$jobId/applicants"
          params={{ slug, jobId: job.id }}
          className={cx(
            buttonStyles.common.root,
            buttonStyles.sizes.sm.root,
            buttonStyles.colors.tertiary.root,
            'hover:no-underline',
          )}
        >
          {m.employerCompany_applicantsLabel()}
        </Link>
        <Button
          color="tertiary"
          size="sm"
          onClick={() => act(() => deleteJob({ data: { slug, id: job.id } }))}
        >
          {m.employerCompany_deleteLabel()}
        </Button>
      </div>

      {message ? <p className="text-error-primary mt-2 text-sm">{message}</p> : null}

      {checkoutOpen && !isLive ? (
        <div className="mt-3">
          <CheckoutPicker
            slug={slug}
            jobId={job.id}
            billingOptions={billingOptions}
            plans={plans}
          />
        </div>
      ) : null}
    </div>
  )
}

function CheckoutPicker({
  slug,
  jobId,
  billingOptions,
  plans,
}: {
  slug: string
  jobId: string
  billingOptions: EmployerBillingOption[]
  plans: JobPostingPlan[]
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')

  async function pay(body: Parameters<typeof checkoutJob>[0]['data']['body']) {
    setMessage('')
    const result = await checkoutJob({ data: { slug, id: jobId, body } })
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    const outcome = result.data
    if (outcome.status === 'checkout' && outcome.checkoutUrl) {
      window.location.assign(outcome.checkoutUrl)
    } else if (outcome.status === 'invoice_sent') {
      setMessage(m.employerCompany_invoiceSentText())
    } else {
      await router.invalidate()
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-secondary p-3">
      <p className="text-sm font-medium">{m.employerCompany_choosePlanHeading()}</p>
      {billingOptions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-tertiary text-xs">{m.employerCompany_reusableCreditsLabel()}</p>
          {billingOptions.map((option) => (
            <Button
              key={option.id}
              color="secondary"
              size="sm"
              className="w-full justify-between"
              onClick={() =>
                pay({
                  billing: {
                    type: option.type,
                    planId: option.planId,
                    id: option.id,
                  },
                })
              }
            >
              <span>{option.planName}</span>
              <span className="text-tertiary">
                {m.employerCompany_creditsRemaining({ count: option.jobsRemaining })}
              </span>
            </Button>
          ))}
        </div>
      ) : null}

      {plans.length > 0 ? (
        <div className="space-y-2">
          <p className="text-tertiary text-xs">{m.employerCompany_buyPlanLabel()}</p>
          {plans.map((plan) => (
            <Button
              key={plan.id}
              color="secondary"
              size="sm"
              className="w-full justify-between"
              onClick={() => pay({ billing: { type: 'new', planId: plan.id } })}
            >
              <span>{plan.name}</span>
              <span className="text-tertiary">
                {formatPrice(plan.prices[0]?.amountCents)}
              </span>
            </Button>
          ))}
        </div>
      ) : billingOptions.length === 0 ? (
        <p className="text-tertiary text-sm">
          {m.employerCompany_noPlansText()}
        </p>
      ) : null}

      {message ? <p className="text-error-primary text-sm">{message}</p> : null}
    </div>
  )
}

function formatPrice(amountCents: number | undefined) {
  if (amountCents === undefined) return ''
  if (amountCents === 0) return m.employerCompany_freeLabel()
  return `$${(amountCents / 100).toFixed(0)}`
}
