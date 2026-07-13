/**
 * Saved jobs — its own tab in the candidate sidebar shell (moved out of
 * the profile page in the Paper layout-B restructure).
 */
import { Text } from "@/components/text"
import {
  createFileRoute,
  getRouteApi,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router'

import { fullJobToCard } from '@cavuno/board/format'

import { toJobCardVM } from '@/board/job-view-model'
import { CandidateShell } from '@/components/account-shell'
import { JobCard } from '@/components/board/job-card'
import { m } from '../paraglide/messages'
import { getAccount, unsaveJob } from '../server/account'

import { Button } from '@/components/base/buttons/button'

const rootApi = getRouteApi('__root__')

export const Route = createFileRoute('/account/saved')({
  loader: async () => {
    try {
      return await getAccount()
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/auth/sign-in' })
    }
  },
  head: () => ({ meta: [{ title: m.accountHome_title() }] }),
  component: SavedJobsPage,
})

function SavedJobsPage() {
  const { me, profile, savedJobs } = Route.useLoaderData()
  const { board } = rootApi.useLoaderData()
  const router = useRouter()

  return (
    <CandidateShell
      active="saved"
      identity={{
        avatarUrl: profile.avatarUrl,
        title: profile.displayName ?? me.email,
        subtitle: me.email,
      }}
    >
      <div className="space-y-4">
        <header>
          <Text as="h1" variant="heading3">
            {m.accountShell_savedJobsNav()}
          </Text>
          <p className="text-tertiary text-sm">
            {m.accountHome_savedJobsHeading({ count: savedJobs.data.length })}
          </p>
        </header>
        {savedJobs.data.length === 0 ? (
          <p className="border-secondary text-tertiary rounded-lg border border-dashed p-10 text-center">
            {m.accountHome_savedJobsEmptyText()}
          </p>
        ) : (
          savedJobs.data.map((saved) => (
            <JobCard
              key={saved.id}
              vm={toJobCardVM(
                fullJobToCard(board.language, saved.job),
                board.language,
                board.labels,
              )}
              action={
                <Button
                  color="tertiary"
                  size="sm"
                  onClick={async () => {
                    await unsaveJob({ data: { jobId: saved.jobId } })
                    await router.invalidate()
                  }}
                >
                  {m.accountHome_unsaveLabel()}
                </Button>
              }
            />
          ))
        )}
      </div>
    </CandidateShell>
  )
}
