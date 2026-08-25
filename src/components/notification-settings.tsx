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
import type { NotificationPreference } from '@cavuno/board';

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
 * Email notification toggles — one checkbox per channel over
 * `board.me.notificationPreferences` (retrieve / update). Each toggle
 * PUTs immediately and refreshes.
 */
export function NotificationSettings({
  preferences,
  updatePreference = updateNotificationPreference,
}: {
  preferences: StarterNotificationPreference[];
  updatePreference?: (options: {
    data: StarterUpdateNotificationPreferenceBody;
  }) => ReturnType<typeof updateNotificationPreference>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <ul className="divide-border divide-y" data-test="notification-settings">
        {preferences.map((pref) => {
          const label = CHANNEL_LABELS[pref.channel];
          return (
            <li
              key={pref.channel}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="font-medium">{label.title()}</p>
                <p className="text-muted-foreground text-sm">
                  {label.description()}
                </p>
              </div>
              <Checkbox
                className="shrink-0"
                aria-label={label.title()}
                checked={pref.subscribed}
                disabled={pending === pref.channel}
                onCheckedChange={async (isSelected) => {
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
