'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { updateNotificationPreference } from '../server/settings';

import { Checkbox } from '@/components/ui/checkbox';
import { toastActionError, toastActionSuccess } from '@/lib/action-toast';
import type { NotificationPreference } from '@cavuno/board';

const CHANNEL_LABELS: Record<
  NotificationPreference['channel'],
  { title: () => string; description: () => string }
> = {
  messageEmails: {
    title: m.notificationSettings_messageEmailsTitle,
    description: m.notificationSettings_messageEmailsDescription,
  },
  applicationEmails: {
    title: m.notificationSettings_applicationEmailsTitle,
    description: m.notificationSettings_applicationEmailsDescription,
  },
};

/**
 * Email notification toggles — one checkbox per channel over
 * `board.me.notificationPreferences` (retrieve / update). Each toggle
 * PUTs immediately and refreshes.
 */
export function NotificationSettings({
  preferences,
}: {
  preferences: NotificationPreference[];
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
                    await updateNotificationPreference({
                      data: {
                        channel: pref.channel,
                        subscribed: isSelected,
                      },
                    });
                    await router.invalidate();
                    void toastActionSuccess();
                  } catch {
                    void toastActionError();
                  } finally {
                    setPending(null);
                  }
                }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
