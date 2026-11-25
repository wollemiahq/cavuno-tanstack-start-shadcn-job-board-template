'use client';

/**
 * Newsletter sign-up for the board's own email (`board.subscribe`), with
 * double opt-in. A centred title and description over a pill-shaped email
 * field with the Subscribe button inside it, and an unticked consent
 * checkbox whose wording names the board.
 *
 * Each placement passes its own `source` (such as `blog-index`), which shows
 * as the person's Source in the board's dashboard. The form sends the
 * checkbox wording as `consentText`, the browser's time zone, the page
 * language and URL, and a hidden `website` honeypot people leave empty.
 *
 * Wiring: `onSubscribe` forwards the input to `board.subscribe` (the
 * `subscribeNewsletter` server function) and resolves with `submitted` and
 * `sendingPaused`, or with `email_domain_undeliverable` and the API's
 * correction. The success message is the same whatever the address's state.
 */
import { useId, useState } from 'react';

import {
  EmailSuggestionHint,
  useEmailSuggestion,
} from '@/components/email-suggestion-hint';
import { Checkbox } from '@/components/ui/checkbox';
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
  title,
  description,
  className,
}: {
  /** The board's name from `board.context()`; the consent wording names it. */
  boardName: string;
  /** Form label, lowercase letters, digits and hyphens (e.g. `blog-index`). */
  source: string;
  /** The page language, such as `de`. */
  locale: string;
  onSubscribe: (
    input: BoardSubscribeInput,
  ) => Promise<NewsletterSubscribeResult>;
  title?: string;
  description?: string;
  className?: string;
}) {
  const headingId = useId();
  const emailInputId = useId();
  const consentId = useId();
  const consentLabelId = useId();
  const consentErrorId = useId();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentMissing, setConsentMissing] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const emailSuggestion = useEmailSuggestion();
  const copy = newsletterCopy(boardName);
  const pending = status === 'pending';
  const emailInvalid = status === 'error' || status === 'undeliverable';

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'bg-muted flex flex-col items-center gap-6 rounded-3xl px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex max-w-xl flex-col gap-2">
        <h2
          id={headingId}
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          {title ?? copy.title}
        </h2>
        <p className="text-muted-foreground">
          {description ?? copy.description}
        </p>
      </div>

      <form
        className="flex w-full max-w-md flex-col gap-3 text-start"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!consent) {
            setConsentMissing(true);
            return;
          }
          setStatus('pending');
          try {
            const result = await onSubscribe({
              email,
              consent: true,
              consentText: copy.consentLabel,
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
            setEmail('');
            setConsent(false);
            emailSuggestion.clear();
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
          <InputGroup className="bg-background h-11 rounded-full ps-2">
            <InputGroupInput
              id={emailInputId}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              placeholder={copy.emailPlaceholder}
              required
              aria-invalid={emailInvalid}
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
          {status === 'submitted' || status === 'paused' ? (
            <FieldDescription role="status">
              {status === 'paused'
                ? `${copy.submitted} ${copy.sendingPaused}`
                : copy.submitted}
            </FieldDescription>
          ) : null}
        </Field>

        <Field orientation="horizontal" data-invalid={consentMissing}>
          <Checkbox
            id={consentId}
            name="consent"
            checked={consent}
            disabled={pending}
            // Base UI gives `id` to its hidden input, so the visible
            // checkbox takes its name from the label explicitly.
            aria-labelledby={consentLabelId}
            aria-invalid={consentMissing}
            aria-describedby={consentMissing ? consentErrorId : undefined}
            onCheckedChange={(checked) => {
              setConsent(checked === true);
              if (checked === true) setConsentMissing(false);
            }}
          />
          <FieldLabel
            id={consentLabelId}
            htmlFor={consentId}
            className="font-normal"
          >
            {copy.consentLabel}
          </FieldLabel>
        </Field>
        {consentMissing ? (
          <FieldError id={consentErrorId}>{copy.consentRequired}</FieldError>
        ) : null}
      </form>
    </section>
  );
}
