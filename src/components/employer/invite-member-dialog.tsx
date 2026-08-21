'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { m } from '../../paraglide/messages';
import { createCompanyInvite } from '../../server/employers';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { boardErrorMessage } from '@/lib/board-error-message';

function inviteErrorMessage(code: string): string {
  if (code === 'already_member') return m.employerMembers_alreadyMemberError();
  if (code === 'already_invited') return m.employerMembers_alreadyInvitedError();
  if (code === 'invalid_email') return m.employerMembers_invalidEmailError();
  return boardErrorMessage({ code });
}

export function InviteMemberDialog({
  slug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [email, setEmail] = useState('');

  function close(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setError(null);
      setEmail('');
      setStatus('idle');
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={async (event) => {
            event.preventDefault();
            const nextEmail = email.trim();
            setError(null);
            if (!nextEmail || !nextEmail.includes('@')) {
              setError(m.employerMembers_invalidEmailError());
              return;
            }
            setStatus('saving');
            try {
              const result = await createCompanyInvite({
                data: { slug, body: { email: nextEmail } },
              });
              if (!result.ok) {
                setError(inviteErrorMessage(result.code));
                return;
              }
              toast.success(m.employerMembers_inviteSentToast());
              close(false);
              await router.invalidate();
            } catch {
              setError(m.employerMembers_updateError());
            } finally {
              setStatus('idle');
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{m.employerMembers_inviteDialogTitle()}</DialogTitle>
            <DialogDescription>
              {m.employerMembers_inviteDialogDescription()}
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="invite-member-email">
              {m.employerMembers_inviteEmailLabel()}
            </FieldLabel>
            <Input
              id="invite-member-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button
              type="submit"
              disabled={status === 'saving' || email.trim().length === 0}
            >
              {m.employerMembers_inviteSubmitLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
