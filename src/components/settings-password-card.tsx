'use client';

import { useState } from 'react';

import { m } from '../paraglide/messages';
import { requestSetPassword, updatePassword } from '../server/settings';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toastActionError, toastActionSuccess } from '@/lib/action-toast';
import { boardErrorMessage } from '@/lib/board-error-message';

const MIN_PASSWORD_LENGTH = 8;

type RequestPassword = (options: {
  data: { email: string };
}) => ReturnType<typeof requestSetPassword>;
type UpdateCurrentPassword = (options: {
  data: { currentPassword: string; newPassword: string };
}) => ReturnType<typeof updatePassword>;

/**
 * Password card — change-password when `hasPassword`, otherwise the
 * set-password path that reuses `board.auth.forgotPassword`.
 */
export function SettingsPasswordCard({
  hasPassword,
  email,
  requestPassword = requestSetPassword,
  updateCurrentPassword = updatePassword,
}: {
  hasPassword: boolean;
  email: string;
  requestPassword?: RequestPassword;
  updateCurrentPassword?: UpdateCurrentPassword;
}) {
  if (!hasPassword) {
    return <SetPasswordCard email={email} requestPassword={requestPassword} />;
  }
  return <ChangePasswordCard updateCurrentPassword={updateCurrentPassword} />;
}

function ChangePasswordCard({
  updateCurrentPassword,
}: {
  updateCurrentPassword: UpdateCurrentPassword;
}) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');

  return (
    <Card data-test="settings-password-card" data-mode="has-password">
      <CardHeader>
        <CardTitle>
          <h2>{m.settingsPassword_title()}</h2>
        </CardTitle>
        <CardDescription>{m.settingsPassword_description()}</CardDescription>
      </CardHeader>
      <form
        method="post"
        className="contents"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const currentPassword = String(data.get('currentPassword') ?? '');
          const newPassword = String(data.get('newPassword') ?? '');
          const confirmPassword = String(data.get('confirmPassword') ?? '');
          setError(null);
          if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(m.settingsPassword_tooShortError());
            return;
          }
          if (newPassword !== confirmPassword) {
            setError(m.settingsPassword_mismatchError());
            return;
          }
          setStatus('saving');
          try {
            const result = await updateCurrentPassword({
              data: { currentPassword, newPassword },
            });
            if (result.ok) {
              form.reset();
              void toastActionSuccess(m.settingsPassword_updatedToast());
              return;
            }
            setError(
              result.code === 'invalid_current_password'
                ? m.settingsPassword_invalidCurrentError()
                : boardErrorMessage(result),
            );
          } catch {
            void toastActionError();
            setError(m.candidateAction_errorText());
          } finally {
            setStatus('idle');
          }
        }}
      >
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="settings-current-password">
              {m.settingsPassword_currentLabel()}
            </FieldLabel>
            <Input
              id="settings-current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-new-password">
              {m.settingsPassword_newLabel()}
            </FieldLabel>
            <Input
              id="settings-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="settings-confirm-password">
              {m.settingsPassword_confirmLabel()}
            </FieldLabel>
            <Input
              id="settings-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              aria-invalid={error ? true : undefined}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving'
              ? m.settingsPassword_updatingLabel()
              : m.settingsPassword_submitLabel()}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function SetPasswordCard({
  email,
  requestPassword,
}: {
  email: string;
  requestPassword: RequestPassword;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');

  return (
    <Card data-test="settings-password-card" data-mode="set-password">
      <CardHeader>
        <CardTitle>
          <h2>{m.settingsPassword_setTitle()}</h2>
        </CardTitle>
        <CardDescription>{m.settingsPassword_setDescription()}</CardDescription>
      </CardHeader>
      {sent ? (
        <CardContent>
          <p className="text-sm">{m.settingsPassword_checkInbox()}</p>
        </CardContent>
      ) : (
        <>
          {error ? (
            <CardContent>
              <FieldError>{error}</FieldError>
            </CardContent>
          ) : null}
          <CardFooter className="justify-end border-t">
            <Button
              type="button"
              disabled={status === 'saving'}
              onClick={async () => {
                setError(null);
                setStatus('saving');
                try {
                  await requestPassword({ data: { email } });
                  setSent(true);
                } catch {
                  setError(m.candidateAction_errorText());
                } finally {
                  setStatus('idle');
                }
              }}
            >
              {status === 'saving'
                ? m.settingsPassword_setSendingLabel()
                : m.settingsPassword_setSubmitLabel()}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
