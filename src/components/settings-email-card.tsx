'use client';

import { useState } from 'react';

import { m } from '../paraglide/messages';
import { requestEmailChange } from '../server/settings';

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
import { boardErrorMessage } from '@/lib/board-error-message';

/**
 * Email change card — one input posts `board.me.requestEmailChange`. Success
 * swaps to a pending notice; `email_taken` / `same_email` render inline.
 */
const PENDING_STORAGE_KEY = 'settingsEmailPendingChange';

/**
 * The pending state must survive the route remount that follows the
 * server-fn call (router invalidation re-renders the route tree), so it
 * is mirrored in sessionStorage. It clears itself once the loader's
 * current email matches (the change was confirmed) or on explicit reset.
 */
function readPendingEmail(currentEmail: string): string | null {
  if (!globalThis.window) return null;
  try {
    const stored = window.sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!stored) return null;
    if (stored.toLowerCase() === currentEmail.toLowerCase()) {
      window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export function SettingsEmailCard({
  currentEmail,
  requestChange = requestEmailChange,
}: {
  currentEmail: string;
  requestChange?: (options: {
    data: { email: string };
  }) => ReturnType<typeof requestEmailChange>;
}) {
  const [pendingEmail, setPendingEmailState] = useState<string | null>(() =>
    readPendingEmail(currentEmail),
  );
  const setPendingEmail = (email: string | null) => {
    setPendingEmailState(email);
    try {
      if (email) {
        window.sessionStorage.setItem(PENDING_STORAGE_KEY, email);
      } else {
        window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable: the in-memory state still covers this render.
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [value, setValue] = useState(currentEmail);
  const unchanged = value.trim().toLowerCase() === currentEmail.toLowerCase();

  if (pendingEmail) {
    return (
      <Card data-test="settings-email-card" data-state="pending">
        <CardHeader>
          <CardTitle>
            <h2>{m.settingsEmail_title()}</h2>
          </CardTitle>
          <CardDescription>
            {m.settingsEmail_pendingBody({ email: pendingEmail })}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-test="settings-email-card" data-state="form">
      <CardHeader>
        <CardTitle>
          <h2>{m.settingsEmail_title()}</h2>
        </CardTitle>
        <CardDescription>{m.settingsEmail_description()}</CardDescription>
      </CardHeader>
      <form
        method="post"
        className="contents"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get('email') ?? '').trim();
          setError(null);
          if (!email || !email.includes('@')) {
            setError(m.settingsEmail_invalidError());
            return;
          }
          setStatus('saving');
          try {
            const result = await requestChange({ data: { email } });
            if (result.ok) {
              setPendingEmail(email);
              return;
            }
            setError(
              result.code === 'same_email'
                ? m.settingsEmail_sameEmailError()
                : result.code === 'email_taken'
                  ? m.settingsEmail_takenError()
                  : boardErrorMessage(result),
            );
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setStatus('idle');
          }
        }}
      >
        <CardContent>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel className="sr-only" htmlFor="settings-new-email">
              {m.settingsEmail_title()}
            </FieldLabel>
            <Input
              id="settings-new-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={status === 'saving' || unchanged}>
            {m.settingsEmail_submitLabel()}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
