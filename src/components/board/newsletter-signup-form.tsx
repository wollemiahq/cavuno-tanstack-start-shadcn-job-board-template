'use client';

/**
 * Newsletter sign-up for the board's own email (`board.subscribe`), with
 * double opt-in: a pill-shaped email field with the Subscribe button inside
 * it, and one muted line under it saying what the person agrees to.
 * Pressing Subscribe is the consent; that line is sent as `consentText`, so
 * it names the board.
 *
 * Each placement passes its own `source` (such as `blog-index`), which shows
 * as the person's Source in the board's dashboard. The form also sends the
 * browser's time zone, the page language and URL, and a hidden `website`
 * honeypot people leave empty. The surrounding heading and container belong
 * to the placement.
 *
 * Wiring: `onSubscribe` forwards the input to `board.subscribe` (the
 * `subscribeNewsletter` server function) and resolves with `submitted` and
 * `sendingPaused`, or with `email_domain_undeliverable` and the API's
 * correction. After a sign-up the confirmation replaces the form; it reads
 * the same whatever the address's state.
 */
import { useEffect, useId, useRef, useState } from 'react';

import {
  EmailSuggestionHint,
  useEmailSuggestion,
} from '@/components/email-suggestion-hint';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { newsletterCopy } from '@/copy-groups/newsletter';
import { cn } from '@/lib/utils';
import type { BoardSubscribeInput } from '@cavuno/board';

type Status =
  | 'idle'
  | 'pending'
  | 'submitted'
  | 'paused'
  | 'error'
  | 'undeliverable';

export type NewsletterSubscribeResult =
  | { status: 'submitted'; sendingPaused: boolean }
  | { status: 'email_domain_undeliverable'; suggestion?: string | null };

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function NewsletterSignupForm({
  boardName,
  source,
  locale,
  onSubscribe,
  align = 'center',
  className,
}: {
  /** The board's name from `board.context()`; the consent line names it. */
  boardName: string;
  /** Form label, lowercase letters, digits and hyphens (e.g. `blog-index`). */
  source: string;
  /** The page language, such as `de`. */
  locale: string;
  onSubscribe: (
    input: BoardSubscribeInput,
  ) => Promise<NewsletterSubscribeResult>;
  /** `center` under a centred heading; `start` in a card or footer column. */
  align?: 'center' | 'start';
  className?: string;
}) {
  const emailInputId = useId();
  const consentId = useId();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const emailSuggestion = useEmailSuggestion();
  const copy = newsletterCopy(boardName);
  const pending = status === 'pending';
  const emailInvalid = status === 'error' || status === 'undeliverable';
  const done = status === 'submitted' || status === 'paused';
  const centered = align === 'center';
  // The submit button goes away with the form, so focus moves to the
  // confirmation that replaces it.
  const confirmationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (done) confirmationRef.current?.focus();
  }, [done]);

  if (done) {
    return (
      <div
        ref={confirmationRef}
        role="status"
        tabIndex={-1}
        className={cn(
          'flex w-full max-w-md flex-col gap-1 outline-none',
          centered && 'items-center text-center',
          className,
        )}
      >
        <p className="text-foreground text-sm">{copy.submitted}</p>
        {status === 'paused' ? (
          <p className="text-muted-foreground text-sm">{copy.sendingPaused}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className={cn('flex w-full max-w-md flex-col text-start', className)}
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus('pending');
        try {
          const result = await onSubscribe({
            email,
            consent: true,
            consentText: copy.consentText,
            source,
            website,
            timeZone: browserTimeZone(),
            locale,
            pageUrl: window.location.href,
          });
          if (result.status === 'email_domain_undeliverable') {
            emailSuggestion.refuse(email, result.suggestion);
            setStatus('undeliverable');
            return;
          }
          setStatus(result.sendingPaused ? 'paused' : 'submitted');
        } catch {
          setStatus('error');
        }
      }}
    >
      {/* Honeypot: people never see or fill it; bots do. */}
      <div aria-hidden="true" className="sr-only">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <Field data-invalid={emailInvalid}>
        <FieldLabel className="sr-only" htmlFor={emailInputId}>
          {copy.emailLabel}
        </FieldLabel>
        <InputGroup className="h-11 rounded-full ps-2">
          <InputGroupInput
            id={emailInputId}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            required
            aria-invalid={emailInvalid}
            aria-describedby={consentId}
            value={email}
            disabled={pending}
            onChange={(event) => {
              setEmail(event.target.value);
              emailSuggestion.clear();
              if (!pending && status !== 'idle') setStatus('idle');
            }}
            onBlur={(event) => emailSuggestion.check(event.target.value)}
          />
          <InputGroupAddon align="inline-end" className="pe-1.5">
            <InputGroupButton
              type="submit"
              variant="default"
              size="sm"
              className="h-8 rounded-full px-4"
              disabled={pending}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? copy.subscribingLabel : copy.submitLabel}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <EmailSuggestionHint
          suggestion={emailSuggestion.suggestion}
          refusedEmail={
            status === 'undeliverable' ? emailSuggestion.refusedEmail : null
          }
          disabled={pending}
          onAccept={(suggested) => {
            setEmail(suggested);
            emailSuggestion.clear();
            setStatus('idle');
          }}
        />
        {status === 'error' ? <FieldError>{copy.error}</FieldError> : null}
        <FieldDescription
          id={consentId}
          className={cn(centered && 'text-center')}
        >
          {copy.consentText}
        </FieldDescription>
      </Field>
    </form>
  );
}
