'use client'

import { useState } from 'react'

import { useRouter } from '@tanstack/react-router'
import type { NotificationPreference } from '@cavuno/board'

import { Checkbox } from '@/components/base/checkbox/checkbox'
import { updateNotificationPreference } from '../server/settings'

const CHANNEL_LABELS: Record<
  NotificationPreference['channel'],
  { title: string; description: string }
> = {
  messageEmails: {
    title: 'Messages',
    description: 'Email me when an employer sends me a message.',
  },
  applicationEmails: {
    title: 'Application updates',
    description: 'Email me about updates to jobs I’ve applied to.',
  },
}

/**
 * Email notification toggles — one checkbox per channel over
 * `board.me.notificationPreferences` (retrieve / update). Each toggle
 * PUTs immediately and refreshes.
 */
export function NotificationSettings({
  preferences,
}: {
  preferences: NotificationPreference[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  return (
    <ul className="divide-secondary divide-y" data-test="notification-settings">
      {preferences.map((pref) => {
        const label = CHANNEL_LABELS[pref.channel]
        return (
          <li
            key={pref.channel}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div>
              <p className="font-medium">{label.title}</p>
              <p className="text-tertiary text-sm">
                {label.description}
              </p>
            </div>
            <Checkbox
              className="shrink-0"
              aria-label={label.title}
              isSelected={pref.subscribed}
              isDisabled={pending === pref.channel}
              onChange={async (isSelected) => {
                setPending(pref.channel)
                try {
                  await updateNotificationPreference({
                    data: {
                      channel: pref.channel,
                      subscribed: isSelected,
                    },
                  })
                  await router.invalidate()
                } finally {
                  setPending(null)
                }
              }}
            />
          </li>
        )
      })}
    </ul>
  )
}
