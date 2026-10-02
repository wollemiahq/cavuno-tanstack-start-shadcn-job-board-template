'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { updateNotificationPreference } from '../server/settings';

import type {
  StarterNotificationChannel,
  StarterUpdateNotificationPreferenceBody,
} from '../server/settings';
import { Checkbox } from '@/components/ui/checkbox';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionSuccess,
} from '@/lib/action-toast';
import type { BoardUser, NotificationPreference } from '@cavuno/board';

type StarterNotificationPreference = Omit<NotificationPreference, 'channel'> & {
  channel: StarterNotificationChannel;
};

const CHANNEL_LABELS = {
  messageEmails: {
    title: m.notificationSettings_messageEmailsTitle,
    description: m.notificationSettings_messageEmailsDescription,
  },
  applicationEmails: {
    title: m.notificationSettings_applicationEmailsTitle,
    description: m.notificationSettings_applicationEmailsDescription,
  },
  recommendedJobEmails: {
    title: m.notificationSettings_recommendedJobEmailsTitle,
    description: m.notificationSettings_recommendedJobEmailsDescription,
  },
} satisfies Record<
  StarterNotificationChannel,
  { title: () => string; description: () => string }
>;

/**
 * Employers share the message and application channels but receive
 * different emails on them: `applicationEmails` is the "a candidate applied
 * to your company's job" email. Job recommendations are candidate-only.
 */
const EMPLOYER_CHANNEL_LABELS = {
  messageEmails: {
    title: m.notificationSettings_messageEmailsTitle,
    description: m.notificationSettings_employerMessageEmailsDescription,
  },
  applicationEmails: {
    title: m.notificationSettings_employerApplicationEmailsTitle,
    description: m.notificationSettings_employerApplicationEmailsDescription,
  },
} satisfies Partial<
  Record<
    StarterNotificationChannel,
    { title: () => string; description: () => string }
  >
>;

function channelLabel(
  channel: StarterNotificationChannel,
  role: BoardUser['role'],
) {
  if (role === 'employer' && channel !== 'recommendedJobEmails') {
    return EMPLOYER_CHANNEL_LABELS[channel];
  }
  return CHANNEL_LABELS[channel];
}

/**
 * Email notification toggles — one checkbox per channel over
 * `board.me.notificationPreferences` (retrieve / update). Each toggle
 * PUTs immediately and refreshes.
 */
export function NotificationSettings({
  preferences,
  role = 'candidate',
  recommendedJobEmailsEnabled = true,
  updatePreference = updateNotificationPreference,
}: {
  preferences: StarterNotificationPreference[];
  /** The signed-in account's role; employers get no job-seeker channels. */
  role?: BoardUser['role'];
  recommendedJobEmailsEnabled?: boolean;
  updatePreference?: (options: {
    data: StarterUpdateNotificationPreferenceBody;
  }) => ReturnType<typeof updateNotificationPreference>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const visiblePreferences =
    role === 'employer'
      ? preferences.filter((pref) => pref.channel !== 'recommendedJobEmails')
      : preferences;

  return (
    <div className="space-y-3">
      <ul className="divide-border divide-y" data-test="notification-settings">
        {visiblePreferences.map((pref) => {
          const label = channelLabel(pref.channel, role);
          const recommendationPaused =
            pref.channel === 'recommendedJobEmails' &&
            !recommendedJobEmailsEnabled;
          const disabled =
            pending === pref.channel ||
            (recommendationPaused && !pref.subscribed);
          return (
            <li
              key={pref.channel}
              id={
                pref.channel === 'recommendedJobEmails'
                  ? 'job-match-emails'
                  : undefined
              }
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="flex items-center gap-2 font-medium">
                  <span>{label.title()}</span>
                  {recommendationPaused ? (
                    <span className="text-muted-foreground text-xs">
                      {m.alertManager_pausedBadge()}
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-sm">
                  {label.description()}
                </p>
              </div>
              <Checkbox
                className="shrink-0"
                aria-label={label.title()}
                checked={pref.subscribed}
                disabled={disabled}
                onCheckedChange={async (isSelected) => {
                  if (recommendationPaused && !pref.subscribed) return;
                  setPending(pref.channel);
                  try {
                    await updatePreference({
                      data: {
                        channel: pref.channel,
                        subscribed: isSelected,
                      },
                    });
                  } catch {
                    void toastActionError();
                    setPending(null);
                    return;
                  }
                  void toastActionSuccess();
                  await reconcileCommittedAction(() => router.invalidate());
                  setPending(null);
                }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
