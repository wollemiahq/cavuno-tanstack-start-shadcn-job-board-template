import { useEffect, useId, useState } from 'react';

import { m } from '../paraglide/messages';
import { updateNotificationPreference } from '../server/settings';

import type { StarterUpdateNotificationPreferenceBody } from '../server/settings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionSuccess,
} from '@/lib/action-toast';
import type { NotificationPreference } from '@cavuno/board';

/** The same saved email preference offered in Settings, next to the matches. */
export function JobMatchEmailPreference({
  preference,
  onRefresh,
  updatePreference = updateNotificationPreference,
}: {
  preference: NotificationPreference | null;
  onRefresh: () => void | Promise<void>;
  updatePreference?: (options: {
    data: StarterUpdateNotificationPreferenceBody;
  }) => ReturnType<typeof updateNotificationPreference>;
}) {
  const id = useId();
  const [saved, setSaved] = useState(preference);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSaved(preference);
  }, [preference]);

  async function changeSubscription(subscribed: boolean) {
    setPending(true);
    let result: Awaited<ReturnType<typeof updatePreference>>;
    try {
      result = await updatePreference({
        data: { channel: 'recommendedJobEmails', subscribed },
      });
    } catch {
      setPending(false);
      void toastActionError();
      return;
    }
    setSaved(
      result.data.find((pref) => pref.channel === 'recommendedJobEmails') ??
        null,
    );
    void toastActionSuccess();
    await reconcileCommittedAction(onRefresh);
    setPending(false);
  }

  return (
    <div className="max-w-lg pt-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p id={`${id}-label`} className="text-sm font-medium">
            {m.accountRecommended_emailLabel()}
          </p>
          <p id={`${id}-description`} className="text-muted-foreground text-sm">
            {saved?.waitlisted
              ? m.accountRecommended_emailWaitlistedText()
              : m.notificationSettings_recommendedJobEmailsDescription()}
          </p>
        </div>
        {saved ? (
          <Switch
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-description`}
            checked={saved.subscribed}
            disabled={pending}
            onCheckedChange={(checked) => void changeSubscription(checked)}
          />
        ) : null}
      </div>
      {saved === null ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <p role="alert" className="text-muted-foreground text-sm">
            {m.accountRecommended_emailLoadError()}
          </p>
          <Button
            variant="link"
            size="sm"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await reconcileCommittedAction(onRefresh);
              setPending(false);
            }}
          >
            {m.appError_retryAction()}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
