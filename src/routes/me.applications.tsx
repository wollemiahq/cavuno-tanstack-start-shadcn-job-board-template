/**
 * `/me/applications` — the signed-in candidate's applications (ADR-0054), over
 * `board.me.applications.*` (list / withdraw). Status is the coarse,
 * Himalayas-grounded candidate view (applied → interviewing → … → archived).
 */
import { Text } from "@/components/text"
import {
  createFileRoute,
  isRedirect,
  Link,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import type { Application } from '@cavuno/board'

import { CandidateShell } from '@/components/account-shell'
import { m } from '../paraglide/messages'
import { getApplications, withdrawApplication } from '../server/applications'

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'

const STATUS_LABEL: Record<Application['status'], () => string> = {
  applied: m.meApplications_statusApplied,
  interviewing: m.meApplications_statusInterviewing,
  negotiation: m.meApplications_statusNegotiation,
  hired: m.meApplications_statusHired,
  archived: m.meApplications_statusArchived,
}

function isEmailUnverified(error: unknown) {
  return String(error).includes('EMAIL_UNVERIFIED')
}

export const Route = createFileRoute('/me/applications')({
  loader: async () => {
    try {
      return await getApplications({ data: undefined })
    } catch (error) {
      if (isRedirect(error)) throw error
      if (isEmailUnverified(error)) {
        throw redirect({ to: '/auth/verify-email-required' })
      }
      throw redirect({ to: '/auth/sign-in' })
    }
  },
  head: () => ({ meta: [{ title: m.meApplications_title() }] }),
  component: ApplicationsPage,
})

function ApplicationsPage() {
  const applications = Route.useLoaderData()
  const router = useRouter()

  return (
    <CandidateShell active="applications">
      <div className="space-y-6">
      <header>
        <Text as="h1" variant="heading3">{m.meApplications_title()}</Text>
        <p className="text-tertiary text-sm">
          {m.meApplications_subheading()}
        </p>
      </header>

      {applications.data.length === 0 ? (
        <p className="border-secondary text-tertiary rounded-lg border border-dashed p-10 text-center">
          {m.meApplications_emptyText()}{' '}
          <Link
            to="/jobs/$keyword"
            params={{ keyword: 'all' }}
            className="underline"
          >
            {m.meApplications_browseJobsLink()}
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3" data-test="applications-list">
          {applications.data.map((application) => (
            <li
              key={application.id}
              className="border-secondary flex items-start justify-between gap-4 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {application.job?.slug && application.job.companySlug ? (
                    <Link
                      to="/companies/$companySlug/jobs/$jobSlug"
                      params={{
                        companySlug: application.job.companySlug,
                        jobSlug: application.job.slug,
                      }}
                      className="font-medium underline"
                    >
                      {application.job.title}
                    </Link>
                  ) : (
                    <p className="font-medium">
                      {application.job?.title ?? m.meApplications_jobFallbackLabel()}
                    </p>
                  )}
                  <Badge
                    size="sm"
                    type="pill-color"
                    color={
                      application.status === 'archived' ? 'gray' : 'brand'
                    }
                  >
                    {STATUS_LABEL[application.status]()}
                  </Badge>
                </div>
                {application.job?.companyName ? (
                  <p className="text-tertiary text-sm">
                    {application.job.companyName}
                  </p>
                ) : null}
                <p className="text-tertiary text-xs">
                  {m.meApplications_appliedOn({
                    date: new Date(application.appliedAt).toLocaleDateString(),
                  })}
                </p>
              </div>
              {application.status !== 'archived' ? (
                <Button
                  color="tertiary"
                  size="sm"
                  data-test="application-withdraw"
                  onClick={async () => {
                    await withdrawApplication({ data: { id: application.id } })
                    await router.invalidate()
                  }}
                >
                  {m.meApplications_withdrawLabel()}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      </div>
    </CandidateShell>
  )
}
