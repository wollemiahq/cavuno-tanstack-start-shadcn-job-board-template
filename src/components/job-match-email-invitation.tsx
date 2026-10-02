import { useId, useRef, useState } from 'react';

import { ArrowRight, Mail } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionReconciliationError,
  toastActionSuccess,
} from '@/lib/action-toast';
import { m } from '@/paraglide/messages';
import { updateNotificationPreference } from '@/server/settings';
import type { NotificationPreference } from '@cavuno/board';

/** Enable matching-job emails without leaving the candidate's matches. */
export function JobMatchEmailInvitation({
  preference,
  onEnabled,
  updatePreference = updateNotificationPreference,
}: {
  preference: NotificationPreference | null;
  onEnabled: () => void | Promise<void>;
  updatePreference?: typeof updateNotificationPreference;
}) {
  const errorId = useId();
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    source: NotificationPreference;
    saved: NotificationPreference;
  } | null>(null);

  // The accepted response wins while the loader still has its old snapshot.
  // A newer server preference (for example a Settings opt-out) wins afterward.
  const confirmedIsCurrent =
    confirmed &&
    (preference === confirmed.source ||
      (confirmed.saved.updatedAt != null &&
        (preference?.updatedAt == null ||
          preference.updatedAt <= confirmed.saved.updatedAt)));
  if (!preference || preference.subscribed || confirmedIsCurrent) return null;

  async function enableEmails() {
    if (saving.current || !preference) return;
    saving.current = true;
    setPending(true);
    setError(false);
    try {
      const result = await updatePreference({
        data: { channel: 'recommendedJobEmails', subscribed: true },
      });
      const saved = result.data.find(
        (item) => item.channel === 'recommendedJobEmails',
      );
      if (!saved?.subscribed) throw new Error('Subscription not confirmed');
      setConfirmed({ source: preference, saved });
    } catch {
      setError(true);
      void toastActionError();
      saving.current = false;
      setPending(false);
      return;
    }
    void toastActionSuccess();
    await reconcileCommittedAction(onEnabled, toastActionReconciliationError);
    saving.current = false;
    setPending(false);
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle
          role="heading"
          aria-level={2}
          className="flex items-center gap-2"
        >
          <Mail className="size-4" aria-hidden="true" />
          {m.accountRecommended_emailInvitationTitle()}
        </CardTitle>
        <CardDescription>
          {m.notificationSettings_recommendedJobEmailsDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          aria-busy={pending}
          aria-describedby={error ? errorId : undefined}
          onClick={() => void enableEmails()}
        >
          {pending
            ? m.profileForm_savingLabel()
            : m.accountRecommended_emailInvitationAction()}
          {pending ? (
            <Spinner data-icon="inline-end" aria-hidden="true" />
          ) : (
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          )}
        </Button>
        {error ? (
          <Alert id={errorId} variant="destructive">
            <AlertDescription>{m.candidateAction_errorText()}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
