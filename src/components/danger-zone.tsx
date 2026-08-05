'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { deleteAccount } from '../server/account';
import { signOut } from '../server/auth';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// The confirm word is part of the localized instruction sentence
// (dangerZone_confirmLabel interpolates it) — an English DELETE inside a
// German sentence forces the user to type a word the copy never showed.
const CONFIRM_WORD = () => m.dangerZone_confirmWord();

/**
 * Danger zone — irreversible account delete (`board.me.delete()`). This is
 * ahead-of-hosted (no hosted candidate delete UI); the typed confirmation
 * guards against accidents. On success we clear the session and go home.
 */
export function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle');

  const resetConfirmation = () => {
    setConfirm('');
    setStatus('idle');
  };

  return (
    <Card className="ring-destructive/40" data-test="danger-zone">
      <CardHeader>
        <CardTitle>
          <h2 className="text-destructive">{m.dangerZone_heading()}</h2>
        </CardTitle>
        <CardDescription>{m.dangerZone_warningText()}</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && status === 'deleting') return;
            setOpen(nextOpen);
            if (!nextOpen) resetConfirmation();
          }}
        >
          <AlertDialogTrigger render={<Button variant="destructive" />}>
            {m.dangerZone_deleteAccountLabel()}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.dangerZone_heading()}</AlertDialogTitle>
              <AlertDialogDescription>
                {m.dangerZone_warningText()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Field data-invalid={status === 'error' || undefined}>
              <FieldLabel htmlFor="delete-account-confirmation">
                {m.dangerZone_confirmLabel({ word: CONFIRM_WORD() })}
              </FieldLabel>
              <Input
                id="delete-account-confirmation"
                value={confirm}
                autoComplete="off"
                aria-invalid={status === 'error' || undefined}
                onChange={(event) => setConfirm(event.target.value)}
              />
              {status === 'error' ? (
                <FieldError>{m.dangerZone_deleteError()}</FieldError>
              ) : null}
            </Field>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={status === 'deleting'}>
                {m.dangerZone_cancelLabel()}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={confirm !== CONFIRM_WORD() || status === 'deleting'}
                onClick={async () => {
                  setStatus('deleting');
                  try {
                    await deleteAccount();
                    await signOut();
                    await router.invalidate();
                    await router.navigate({ to: '/' });
                    setOpen(false);
                    resetConfirmation();
                  } catch {
                    setStatus('error');
                  }
                }}
              >
                {status === 'deleting'
                  ? m.dangerZone_deletingLabel()
                  : m.dangerZone_deleteConfirmLabel()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
