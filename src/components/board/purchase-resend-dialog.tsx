'use client';

/**
 * "Already bought it? Get your download link": the buyer types the purchase
 * email and the board emails the link again. The API always accepts (it
 * never reveals whether an address bought anything), so the confirmation is
 * worded the same either way.
 */
import { useId, useState, type FormEvent, type ReactElement } from 'react';

import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { boardErrorMessage } from '@/lib/board-error-message';

export type ResendLinkAction = (input: {
  data: { email: string; productSlug?: string; website?: string };
}) => Promise<
  | { ok: true; data: unknown }
  | { ok: false; code: string | null; message: string }
>;

export function PurchaseResendDialog({
  productSlug,
  trigger,
  resend,
  defaultEmail,
}: {
  productSlug?: string;
  trigger: ReactElement;
  resend: ResendLinkAction;
  defaultEmail?: string | null;
}) {
  const id = useId();
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'sent' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus('pending');
    setError(null);
    try {
      const result = await resend({
        data: {
          email: email.trim(),
          productSlug,
          website: website || undefined,
        },
      });
      if (result.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
        setError(boardErrorMessage(result));
      }
    } catch {
      setStatus('error');
      setError(boardErrorMessage({}));
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && status === 'sent') setStatus('idle');
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.purchaseResend_title()}</DialogTitle>
          <DialogDescription>
            {m.purchaseResend_description()}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={submit}
          className="flex flex-col gap-4"
          data-test="purchase-resend-form"
        >
          <Field data-invalid={status === 'error' || undefined}>
            <FieldLabel htmlFor={`${id}-email`}>
              {m.product_emailLabel()}
            </FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status !== 'pending') setStatus('idle');
              }}
            />
            {status === 'error' && error ? (
              <FieldError>{error}</FieldError>
            ) : status === 'sent' ? (
              <FieldDescription role="status">
                {m.purchaseResend_sentText()}
              </FieldDescription>
            ) : null}
          </Field>
          <div aria-hidden="true" className="sr-only">
            <label htmlFor={`${id}-website`}>{m.contact_websiteLabel()}</label>
            <input
              id={`${id}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={status === 'pending'}>
            {status === 'pending' ? <Spinner data-icon="inline-start" /> : null}
            {m.purchaseResend_submitAction()}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
