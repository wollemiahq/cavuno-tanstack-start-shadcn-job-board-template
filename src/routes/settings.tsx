/**
 * Settings — email notification preferences.
 *
 * Two modes share the route, mirroring the hosted `/settings`:
 *  - signed-in: auth-gated toggles (`board.me.notificationPreferences`).
 *  - email link: a one-click unsubscribe with an HMAC token in the query
 *    (`?boardUserId&channel&token`) — handled in the loader BEFORE the auth
 *    branch, so an unauthenticated recipient is never bounced to sign-in.
 */
import { Text } from '@/components/text'
import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'

import { CandidateShell } from '@/components/account-shell'
import { NotificationSettings } from '../components/notification-settings'
import { m } from '../paraglide/messages'
import {
  getNotificationPreferences,
  unsubscribeWithToken,
} from '../server/settings'

import { Button } from '@/components/base/buttons/button'

type Channel = 'messageEmails' | 'applicationEmails'

type Search = {
  token?: string
  boardUserId?: string
  channel?: Channel
}

function asChannel(value: unknown): Channel | undefined {
  return value === 'messageEmails' || value === 'applicationEmails'
    ? value
    : undefined
}

export const Route = createFileRoute('/settings')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    boardUserId:
      typeof search.boardUserId === 'string' ? search.boardUserId : undefined,
    channel: asChannel(search.channel),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (deps.token && deps.boardUserId && deps.channel) {
      try {
        await unsubscribeWithToken({
          data: {
            token: deps.token,
            boardUserId: deps.boardUserId,
            channel: deps.channel,
          },
        })
        return { mode: 'unsubscribed' as const, channel: deps.channel }
      } catch {
        return { mode: 'unsubscribe-failed' as const }
      }
    }
    try {
      const preferences = await getNotificationPreferences()
      return { mode: 'settings' as const, preferences: preferences.data }
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/auth/sign-in' })
    }
  },
  head: () => ({ meta: [{ title: m.settings_title() }] }),
  component: SettingsPage,
})

const CHANNEL_NAMES: Record<Channel, () => string> = {
  messageEmails: m.settings_channelMessage,
  applicationEmails: m.settings_channelApplicationUpdate,
}

function SettingsPage() {
  const data = Route.useLoaderData()

  if (data.mode === 'unsubscribed') {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center">
        <Text as="h1" variant="heading1">{m.settings_unsubscribedHeading()}</Text>
        <p className="text-tertiary text-sm">
          {m.settings_unsubscribedBody({ channel: CHANNEL_NAMES[data.channel]() })}
        </p>
        <Button color="secondary" size="md" href="/account">
          {m.settings_goToAccountLabel()}
        </Button>
      </div>
    )
  }

  if (data.mode === 'unsubscribe-failed') {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center">
        <Text as="h1" variant="heading1">{m.settings_linkExpiredHeading()}</Text>
        <p className="text-tertiary text-sm">
          {m.settings_linkExpiredBody()}
        </p>
        <Button color="secondary" size="md" href="/auth/sign-in">
          {m.settings_signInLabel()}
        </Button>
      </div>
    )
  }

  // Signed-in mode renders inside the candidate shell; the anonymous
  // unsubscribe-token branches above stay bare (no session, no sidebar).
  return (
    <CandidateShell active="settings">
      <div className="space-y-6">
        <header>
          <Text as="h1" variant="heading3">{m.settings_title()}</Text>
          <p className="text-tertiary text-sm">{m.settings_emailNotificationsText()}</p>
        </header>
        <NotificationSettings preferences={data.preferences} />
      </div>
    </CandidateShell>
  )
}
