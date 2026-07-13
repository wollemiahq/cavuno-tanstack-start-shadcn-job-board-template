/**
 * /alerts/manage?subscription=&token=… — the self-service page the digest
 * email's manage/unsubscribe links point to (the board's canonical domain, which
 * this starter serves). The subscription-wide token gates the read + unsubscribe
 * /resubscribe; each preference carries its own token for delete.
 *
 * In-place filter editing is intentionally omitted: stored filters use place
 * IDs while the subscribe/update body uses place slugs (not reversible), so
 * editing would drop the location scope. Re-subscribe via the form to change
 * filters. Unsubscribe / resubscribe / delete are the full self-service set here.
 */
import { Text } from '@/components/text'
import { useState } from 'react'

import { createFileRoute, useRouter } from '@tanstack/react-router'

import type { JobAlertManageState, JobAlertStoredFilters } from '@cavuno/board'

import { m } from '../paraglide/messages'

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import {
  deleteJobAlertPreference,
  getJobAlertManageState,
  resubscribeJobAlert,
  unsubscribeJobAlert,
} from '../server/queries'

type LoaderData = { state: JobAlertManageState } | { error: true }

export const Route = createFileRoute('/alerts/manage')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { subscription?: string; token?: string } => ({
    subscription:
      typeof search.subscription === 'string' && search.subscription
        ? search.subscription
        : undefined,
    token:
      typeof search.token === 'string' && search.token ? search.token : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }): Promise<LoaderData> => {
    if (!deps.subscription || !deps.token) return { error: true }
    try {
      const state = await getJobAlertManageState({
        data: { subscription: deps.subscription, token: deps.token },
      })
      return { state }
    } catch {
      return { error: true }
    }
  },
  head: () => ({
    meta: [{ title: m.alertsManage_title() }, { name: 'robots', content: 'noindex' }],
  }),
  component: ManagePage,
})

function filtersSummary(filters: JobAlertStoredFilters): string {
  const parts = [
    ...(filters.jobFunctions ?? []),
    ...(filters.remoteOptions ?? []).map((option) => option.replaceAll('_', ' ')),
  ]
  return parts.length ? parts.join(', ') : m.alertsManage_allJobsText()
}

function ManagePage() {
  const data = Route.useLoaderData()
  const { subscription, token } = Route.useSearch()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  if ('error' in data) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <Text as="h1" variant="heading1">
          {m.alertsManage_invalidTitle()}
        </Text>
        <p className="text-tertiary">
          {m.alertsManage_invalidBody()}
        </p>
      </div>
    )
  }

  const { state } = data
  const run = async (action: () => Promise<unknown>) => {
    setPending(true)
    try {
      await action()
    } finally {
      setPending(false)
      void router.invalidate()
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-12">
      <header className="space-y-1">
        <Text as="h1" variant="heading1">
          {m.alertsManage_title()}
        </Text>
        <p className="text-sm text-tertiary">{state.email}</p>
      </header>

      {state.unsubscribed ? (
        <div className="space-y-2 rounded-lg border border-secondary p-4">
          <p className="text-sm text-tertiary">
            {m.alertsManage_unsubscribedText()}
          </p>
          <Button
            color="primary"
            size="md"
            isDisabled={pending}
            onClick={() =>
              run(() =>
                resubscribeJobAlert({
                  data: { subscriptionId: subscription!, token: token! },
                }),
              )
            }
          >
            {m.alertsManage_resubscribeLabel()}
          </Button>
        </div>
      ) : (
        <Button
          color="secondary"
          size="md"
          isDisabled={pending}
          onClick={() =>
            run(() =>
              unsubscribeJobAlert({
                data: { subscriptionId: subscription!, token: token! },
              }),
            )
          }
        >
          {m.alertsManage_unsubscribeAllLabel()}
        </Button>
      )}

      <ul className="space-y-3">
        {state.preferences.map((preference) => (
          <li
            key={preference.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-secondary p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Badge size="sm" type="pill-color" color={preference.isActive ? 'success' : 'gray'}>
                  {preference.isActive ? m.alertsManage_activeBadge() : m.alertsManage_pausedBadge()}
                </Badge>
                <span className="text-tertiary capitalize">
                  {preference.frequency}
                </span>
              </div>
              <p className="text-sm text-primary">
                {filtersSummary(preference.filters)}
              </p>
            </div>
            <Button
              color="secondary"
              size="sm"
              isDisabled={pending}
              onClick={() =>
                run(() =>
                  deleteJobAlertPreference({
                    data: {
                      subscriptionId: subscription!,
                      preferenceId: preference.id,
                      token: preference.manageToken,
                    },
                  }),
                )
              }
            >
              {m.alertsManage_deleteLabel()}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
